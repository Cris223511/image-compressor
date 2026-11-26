// estado central de la sesión de trabajo: qué imágenes hay, cuáles están marcadas, cómo va la
// compresión y qué resultado dio cada una. la sesión se guarda en el navegador (ver
// lib/persist.ts) para que recargar, retroceder o cerrar la pestaña no pierda nada.

import { create } from 'zustand'
import { CompressionPool } from '../lib/compress/pool'
import type { ErrorCode, ResultNote, Source } from '../lib/compress/types'
import { KIND_EXT, KIND_MIME, type ImageKind } from '../lib/formats'
import { ingest, type Incoming, type NewSkip } from '../lib/intake'
import { useSettings } from './settings'

export type ItemStatus = 'pending' | 'processing' | 'done' | 'kept' | 'error'

export interface ItemResult {
  /** null cuando se conserva el original */
  blob: Blob | null
  name: string
  outSize: number
  outKind: ImageKind
  width: number
  height: number
  note?: ResultNote
  score?: number
  quality?: number
}

export interface Item {
  id: string
  /** fecha de modificación original, para conservarla en el zip descargado */
  mtime: number
  path: string
  name: string
  size: number
  source: Source
  kind: ImageKind
  selected: boolean
  status: ItemStatus
  error?: ErrorCode
  detail?: string
  result?: ItemResult
}

export type Phase = 'empty' | 'ready' | 'running' | 'done'

interface WorkspaceState {
  items: Record<string, Item>
  order: string[]
  skipped: NewSkip[]
  collapsed: Record<string, true>
  phase: Phase
  scanning: boolean
  /** true mientras se recupera la sesión guardada, para no mostrar la portada un instante */
  hydrating: boolean
  /** true si el navegador no dejó guardar la sesión (por ejemplo, sin espacio) */
  persistFailed: boolean

  addIncoming: (incoming: Incoming[]) => Promise<void>
  setSelected: (ids: string[], value: boolean) => void
  toggleFolder: (path: string) => void
  setCollapsedAll: (paths: string[], value: boolean) => void
  clear: () => void
  run: () => Promise<void>
  cancel: () => void
  redo: () => void
}

let pool: CompressionPool | null = null
let abort: AbortController | null = null
let counter = 0

function getPool(): CompressionPool {
  if (!pool) pool = new CompressionPool()
  return pool
}

/** al restaurar una sesión los ids nuevos deben seguir después de los ya usados */
export function reserveIds(used: string[]) {
  for (const id of used) counter = Math.max(counter, Number(id.slice(1)) || 0)
}

function outputName(name: string, inKind: ImageKind, outKind: ImageKind): string {
  if (inKind === outKind) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  return `${stem}.${KIND_EXT[outKind]}`
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  items: {},
  order: [],
  skipped: [],
  collapsed: {},
  phase: 'empty',
  scanning: false,
  hydrating: true,
  persistFailed: false,

  addIncoming: async (incoming) => {
    if (!incoming.length) return
    set({ scanning: true })
    try {
      const used = new Set(Object.values(get().items).map((i) => i.path))
      const res = await ingest(incoming, used)
      const items = { ...get().items }
      const order = [...get().order]
      for (const n of res.items) {
        const id = `i${++counter}`
        items[id] = { ...n, id, selected: true, status: 'pending' }
        order.push(id)
      }
      const skipped = [...get().skipped, ...res.skipped]
      const phase = get().phase
      const hasAny = order.length > 0 || skipped.length > 0
      // al sumar archivos nuevos tras terminar, la sesión vuelve a estar lista para comprimir
      const next: Phase = !hasAny ? 'empty' : phase === 'empty' || (phase === 'done' && res.items.length > 0) ? 'ready' : phase
      set({ items, order, skipped, phase: next })
    } finally {
      set({ scanning: false })
    }
  },

  setSelected: (ids, value) =>
    set((s) => {
      const items = { ...s.items }
      for (const id of ids) {
        const it = items[id]
        if (it && it.status !== 'processing') items[id] = { ...it, selected: value }
      }
      return { items }
    }),

  toggleFolder: (path) =>
    set((s) => {
      const collapsed = { ...s.collapsed }
      if (collapsed[path]) delete collapsed[path]
      else collapsed[path] = true
      return { collapsed }
    }),

  setCollapsedAll: (paths, value) =>
    set(() => {
      const collapsed: Record<string, true> = {}
      if (value) for (const p of paths) collapsed[p] = true
      return { collapsed }
    }),

  clear: () => {
    get().cancel()
    set({ items: {}, order: [], skipped: [], collapsed: {}, phase: 'empty' })
  },

  cancel: () => {
    abort?.abort()
    pool?.cancelQueued()
  },

  redo: () =>
    set((s) => {
      const items: Record<string, Item> = {}
      for (const [id, it] of Object.entries(s.items)) {
        items[id] = { ...it, status: 'pending', result: undefined, error: undefined, detail: undefined }
      }
      return { items, phase: 'ready' }
    }),

  run: async () => {
    const state = get()
    if (state.phase === 'running') return
    const todo = state.order.filter((id) => {
      const it = state.items[id]
      return it.selected && it.status !== 'done' && it.status !== 'kept'
    })
    if (!todo.length) return

    const ctl = new AbortController()
    abort = ctl
    set({ phase: 'running' })
    const settings = useSettings.getState().settings
    const p = getPool()

    const patch = (id: string, change: Partial<Item>) =>
      set((s) => (s.items[id] ? { items: { ...s.items, [id]: { ...s.items[id], ...change } } } : s))

    // los trabajos arrancan en el orden en que se añadieron y pueden avanzar varios a la vez, pero sus
    // resultados se aplican siempre en ese mismo orden: el que termina antes de tiempo espera su turno
    const finished = new Map<number, () => void>()
    let nextToApply = 0
    const applyInOrder = () => {
      while (finished.has(nextToApply)) {
        finished.get(nextToApply)!()
        finished.delete(nextToApply)
        nextToApply++
      }
    }

    let cursor = 0
    const lane = async () => {
      while (cursor < todo.length && !ctl.signal.aborted) {
        const index = cursor++
        const id = todo[index]
        const item = get().items[id]
        if (!item) {
          finished.set(index, () => undefined)
          applyInOrder()
          continue
        }
        patch(id, { status: 'processing' })
        const r = await p.submit({ id, source: item.source, settings, kind: item.kind })
        finished.set(index, () => {
          if (!get().items[id]) return
          if (!r.ok) {
            // una tarea descartada por cancelar vuelve a quedar en espera
            patch(id, r.error === 'cancelled' ? { status: 'pending' } : { status: 'error', error: r.error, detail: r.detail })
            return
          }
          patch(id, {
            status: r.bytes ? 'done' : 'kept',
            result: {
              blob: r.bytes ? new Blob([r.bytes], { type: KIND_MIME[r.outKind] }) : null,
              name: outputName(item.name, r.inKind, r.outKind),
              outSize: r.outSize,
              outKind: r.outKind,
              width: r.width,
              height: r.height,
              note: r.note,
              score: r.score,
              quality: r.quality,
            },
          })
        })
        applyInOrder()
      }
    }

    // un carril de más mantiene ocupados a los workers mientras otro espera a gifsicle
    await Promise.all(Array.from({ length: p.lanes }, lane))
    if (abort === ctl) abort = null
    // si se vació la sesión mientras corría, no se pisa ese estado; al cancelar queda lista para seguir
    if (get().phase === 'running') set({ phase: ctl.signal.aborted ? 'ready' : 'done' })
  },
}))

// solo en desarrollo: deja el estado a mano en la consola para depurar y probar
if (import.meta.env.DEV) (window as unknown as { __ws: typeof useWorkspace }).__ws = useWorkspace
