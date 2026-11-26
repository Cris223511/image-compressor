// guarda la sesión de trabajo en IndexedDB para que recargar, retroceder o cerrar la pestaña
// no haga perder las imágenes añadidas, lo ya comprimido ni una compresión a medias, que se
// retoma sola al volver. todo queda en el navegador y nada sale del equipo.

import type { NewSkip } from './intake'
import type { ErrorCode, Source } from './compress/types'
import type { ImageKind } from './formats'
import { safePath, type ZipEntry } from './zip/reader'
import { MAX_ENTRY_BYTES } from '../config/limits'
import { KIND_MIME } from './formats'
import { useConsent } from '../store/consent'
import { reserveIds, useWorkspace, type Item, type ItemResult, type ItemStatus, type Phase } from '../store/workspace'

const DB_NAME = 'squeezo'
const DEBOUNCE_MS = 350

type SavedSource = { kind: 'file' } | { kind: 'zip'; zip: string; entry: ZipEntry }

interface SavedItem {
  id: string
  mtime: number
  path: string
  name: string
  size: number
  kind: ImageKind
  selected: boolean
  status: ItemStatus
  error?: ErrorCode
  detail?: string
  source: SavedSource
  result?: Omit<ItemResult, 'blob'> & { hasBlob: boolean }
}

interface SavedSession {
  v: 1
  order: string[]
  collapsed: Record<string, true>
  phase: Phase
  skipped: NewSkip[]
  items: SavedItem[]
}

// ---------------------------------------------------------------------------------------
// acceso mínimo a indexeddb, con un almacén para la sesión y otro para los archivos

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv')
      req.result.createObjectStore('blobs')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null
const db = () => (dbPromise ??= open())

async function tx<T>(store: 'kv' | 'blobs', mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode)
    const req = run(t.objectStore(store))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

// ---------------------------------------------------------------------------------------
// qué hay ya guardado y cómo se identifican los zips, que se guardan una sola vez

const written = new Map<string, Blob>()
const zipKeys = new WeakMap<File, string>()
let zipCounter = 0

function zipKeyOf(file: File): string {
  let key = zipKeys.get(file)
  if (!key) {
    key = `zip:${++zipCounter}`
    zipKeys.set(file, key)
  }
  return key
}

// ---------------------------------------------------------------------------------------
// restaurar

let restoring: Promise<void> | null = null

/** se recupera una sola vez, aunque react monte el componente dos veces en desarrollo */
export function restoreSession(): Promise<void> {
  return (restoring ??= doRestore())
}

async function doRestore(): Promise<void> {
  const ws = useWorkspace
  // sin permiso para guardar la sesión no hay nada que recuperar
  if (!useConsent.getState().session) {
    ws.setState({ hydrating: false })
    return
  }
  try {
    const saved = await tx<SavedSession | undefined>('kv', 'readonly', (s) => s.get('session'))
    if (!saved || saved.v !== 1) return

    const files = new Map<string, File>()
    const items: Record<string, Item> = {}
    const order: string[] = []

    for (const si of saved.items) {
      // lo guardado puede venir alterado, así que se descarta lo que no cumpla las mismas reglas de siempre
      if (!(si.kind in KIND_MIME) || safePath(si.path) === null) continue
      if (si.source.kind === 'zip') {
        const e = si.source.entry
        if ((e.method !== 0 && e.method !== 8) || !(e.size <= MAX_ENTRY_BYTES) || !(e.compressedSize <= MAX_ENTRY_BYTES)) continue
      }
      let source: Source
      if (si.source.kind === 'file') {
        const file = await tx<File | undefined>('blobs', 'readonly', (s) => s.get(`src:${si.id}`))
        if (!file) continue
        written.set(`src:${si.id}`, file)
        source = { kind: 'file', file }
      } else {
        const zipKey = si.source.zip
        let zip = files.get(zipKey)
        if (!zip) {
          zip = await tx<File | undefined>('blobs', 'readonly', (s) => s.get(zipKey))
          if (!zip) continue
          files.set(zipKey, zip)
          zipKeys.set(zip, zipKey)
          written.set(zipKey, zip)
          zipCounter = Math.max(zipCounter, Number(zipKey.slice(4)) || 0)
        }
        source = { kind: 'zip', file: zip, entry: si.source.entry }
      }

      let result: ItemResult | undefined
      let status = si.status
      if (si.result) {
        const { hasBlob, ...rest } = si.result
        const blob = hasBlob ? await tx<Blob | undefined>('blobs', 'readonly', (s) => s.get(`res:${si.id}`)) : null
        if (hasBlob && !blob) {
          // si el resultado no llegó a guardarse, la imagen vuelve a la cola
          status = 'pending'
        } else {
          result = { ...rest, blob: blob ?? null }
          if (blob) written.set(`res:${si.id}`, blob)
        }
      }
      // una imagen que estaba a medio comprimir al cerrar vuelve a la cola
      if (status === 'processing') status = 'pending'

      items[si.id] = {
        id: si.id,
        mtime: si.mtime ?? 0,
        path: si.path,
        name: si.name,
        size: si.size,
        kind: si.kind,
        selected: si.selected,
        status,
        error: si.error,
        detail: si.detail,
        source,
        result,
      }
      order.push(si.id)
    }

    if (!order.length && !saved.skipped.length) return
    reserveIds(order)
    // si estaba comprimiendo, se deja lista y se retoma sola más abajo
    const wasRunning = saved.phase === 'running'
    ws.setState({
      items,
      order,
      skipped: saved.skipped,
      collapsed: saved.collapsed,
      phase: order.length ? (saved.phase === 'running' ? 'ready' : saved.phase) : 'ready',
    })
    if (wasRunning) void ws.getState().run()
  } catch {
    // si el almacenamiento no responde se arranca con la sesión vacía, sin mensajes
  } finally {
    ws.setState({ hydrating: false })
  }
}

// ---------------------------------------------------------------------------------------
// cada cambio programa una escritura y solo se suben los archivos nuevos

async function flush() {
  const s = useWorkspace.getState()
  if (s.hydrating || !useConsent.getState().session) return

  if (!s.order.length && !s.skipped.length) {
    await tx('kv', 'readwrite', (k) => k.clear())
    await tx('blobs', 'readwrite', (k) => k.clear())
    written.clear()
    return
  }

  const need = new Map<string, Blob>()
  const saved: SavedItem[] = []
  for (const id of s.order) {
    const it = s.items[id]
    if (!it) continue
    let source: SavedSource
    if (it.source.kind === 'file') {
      need.set(`src:${id}`, it.source.file)
      source = { kind: 'file' }
    } else {
      const key = zipKeyOf(it.source.file)
      need.set(key, it.source.file)
      source = { kind: 'zip', zip: key, entry: it.source.entry }
    }
    let result: SavedItem['result']
    if (it.result) {
      const { blob, ...rest } = it.result
      if (blob) need.set(`res:${id}`, blob)
      result = { ...rest, hasBlob: !!blob }
    }
    saved.push({
      id,
      mtime: it.mtime,
      path: it.path,
      name: it.name,
      size: it.size,
      kind: it.kind,
      selected: it.selected,
      status: it.status,
      error: it.error,
      detail: it.detail,
      source,
      result,
    })
  }

  for (const [key, blob] of need) {
    // solo se omite si la clave ya guarda exactamente este archivo
    if (written.get(key) === blob) continue
    await tx('blobs', 'readwrite', (k) => k.put(blob, key))
    written.set(key, blob)
  }
  for (const key of [...written.keys()]) {
    if (need.has(key)) continue
    await tx('blobs', 'readwrite', (k) => k.delete(key))
    written.delete(key)
  }

  const session: SavedSession = { v: 1, order: s.order, collapsed: s.collapsed, phase: s.phase, skipped: s.skipped, items: saved }
  await tx('kv', 'readwrite', (k) => k.put(session, 'session'))
}

let timer: ReturnType<typeof setTimeout> | undefined
let running = false
let dirty = false

async function drain() {
  if (running) return
  running = true
  try {
    while (dirty) {
      dirty = false
      await flush()
    }
  } catch {
    // lo normal es que falte espacio, así que se avisa en pantalla y se deja de intentar
    useWorkspace.setState({ persistFailed: true })
    dirty = false
  } finally {
    running = false
  }
}

function schedule(now = false) {
  dirty = true
  clearTimeout(timer)
  if (now) void drain()
  else timer = setTimeout(drain, DEBOUNCE_MS)
}

/** al conceder el permiso se guarda lo que haya en pantalla, y al retirarlo se borra lo guardado */
export async function applySessionConsent(on: boolean) {
  if (on) {
    schedule(true)
    return
  }
  clearTimeout(timer)
  dirty = false
  while (running) await new Promise((r) => setTimeout(r, 50))
  // si mientras tanto se volvió a conceder el permiso, no se borra lo que acaba de guardarse
  if (useConsent.getState().session) return
  try {
    await tx('kv', 'readwrite', (k) => k.clear())
    await tx('blobs', 'readwrite', (k) => k.clear())
    written.clear()
  } catch {
    /* si no se puede borrar, tampoco quedó nada nuevo guardado */
  }
}

let started = false

export function startPersisting() {
  if (started) return
  started = true
  // se pide al navegador que no borre estos datos si necesita espacio
  void navigator.storage?.persist?.()

  let last = useWorkspace.getState()
  useWorkspace.subscribe((state) => {
    // la barra de progreso y la miniatura no cambian nada que haya que guardar
    const changed =
      state.items !== last.items ||
      state.order !== last.order ||
      state.skipped !== last.skipped ||
      state.collapsed !== last.collapsed ||
      state.phase !== last.phase
    last = state
    if (changed && !state.hydrating && useConsent.getState().session) schedule()
  })

  // al ocultar o cerrar la pestaña se guarda de inmediato lo que quede pendiente
  const flushNow = () => dirty && schedule(true)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushNow())
  window.addEventListener('pagehide', flushNow)
}
