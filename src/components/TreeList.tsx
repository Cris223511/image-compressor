import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { useShallow } from 'zustand/react/shallow'
import { AlertCircle, ArrowRight, ChevronRight, Columns2, Download, Folder, FolderOpen, GripVertical, Loader2 } from 'lucide-react'
import { Checkbox, type CheckState } from './Checkbox'
import { RemoveButton } from './RemoveButton'
import { Thumb } from './Thumb'
import { useWorkspace, type Item } from '../store/workspace'
import { flatten, type FolderNode, type TreeNode } from '../lib/tree'
import { downloadOne } from '../lib/download'
import { KIND_LABEL } from '../lib/formats'
import { formatBytes, formatSaved } from '../lib/format'
import { useLocale, useT } from '../i18n'

const ROW_H = 56
const INDENT = 22

export function TreeList({ tree, onCompare }: { tree: TreeNode[]; onCompare: (id: string) => void }) {
  const collapsed = useWorkspace((s) => s.collapsed)
  const parent = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => flatten(tree, new Set(Object.keys(collapsed))), [tree, collapsed])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const locked = useWorkspace((s) => s.phase === 'running')
  const moveItem = useWorkspace((s) => s.moveItem)

  // el arrastre para reordenar solo se permite entre archivos de una misma carpeta y mientras no se esté comprimiendo
  // top es la posición de la fila arrastrada dentro de la lista, para que siga al puntero mientras las demás se apartan
  const [drag, setDrag] = useState<{ id: string; over: string | null; top: number } | null>(null)
  // permite soltar el arrastre si la lista desaparece antes de que termine
  const stopDrag = useRef<(() => void) | null>(null)
  useEffect(() => () => stopDrag.current?.(), [])
  const startDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const host = parent.current
      if (!host) return
      const dirOf = (itemId: string) => {
        const path = useWorkspace.getState().items[itemId]?.path ?? ''
        return path.slice(0, path.lastIndexOf('/') + 1)
      }
      const dir = dirOf(id)
      const fromIdx = rowsRef.current.findIndex((r) => r.type === 'file' && r.id === id)
      // la fila arrastrada solo puede recorrer el tramo que ocupan los archivos de su misma carpeta
      const slots = rowsRef.current.flatMap((r, i) => (r.type === 'file' && dirOf(r.id) === dir ? [i] : []))
      const minTop = slots[0] * ROW_H
      const maxTop = slots[slots.length - 1] * ROW_H
      const startTop = fromIdx * ROW_H
      // se recuerda en qué punto de la fila se agarró, para que no salte hacia el puntero
      const grab = e.clientY - host.getBoundingClientRect().top + host.scrollTop - startTop
      let over: string | null = null
      let top = startTop
      let y = e.clientY
      setDrag({ id, over, top })
      document.body.style.cursor = 'grabbing'

      // en cada cuadro se mira qué fila hay bajo el puntero y se desplaza la lista si está en un borde
      let frame = 0
      const tick = () => {
        const rect = host.getBoundingClientRect()
        if (y < rect.top + 36) host.scrollTop -= 10
        else if (y > rect.bottom - 36) host.scrollTop += 10
        const nextTop = Math.round(Math.min(maxTop, Math.max(minTop, y - rect.top + host.scrollTop - grab)))
        // la fila de destino es la que queda bajo el centro de la arrastrada
        const idx = Math.floor((nextTop + ROW_H / 2) / ROW_H)
        const row = rowsRef.current[idx]
        let next = over
        if (idx === fromIdx) next = null
        else if (row && row.type === 'file' && dirOf(row.id) === dir) next = row.id
        if (next !== over || nextTop !== top) {
          over = next
          top = nextTop
          setDrag({ id, over, top })
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)

      const onMove = (ev: PointerEvent) => (y = ev.clientY)
      const finish = (commit: boolean) => {
        cancelAnimationFrame(frame)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        window.removeEventListener('keydown', onKey)
        document.body.style.cursor = ''
        stopDrag.current = null
        if (commit && over) moveItem(id, over)
        setDrag(null)
      }
      stopDrag.current = () => finish(false)
      const onUp = () => finish(true)
      const onCancel = () => finish(false)
      const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && finish(false)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      window.addEventListener('keydown', onKey)
    },
    [moveItem],
  )

  // con el teclado, las flechas mueven la imagen un lugar dentro de su carpeta
  const nudge = useCallback(
    (id: string, step: -1 | 1) => {
      const { items, order } = useWorkspace.getState()
      const dirOf = (itemId: string) => (items[itemId]?.path ?? '').slice(0, (items[itemId]?.path ?? '').lastIndexOf('/') + 1)
      const siblings = order.filter((o) => dirOf(o) === dirOf(id))
      const target = siblings[siblings.indexOf(id) + step]
      if (target) moveItem(id, target)
    },
    [moveItem],
  )

  // mientras se arrastra, cada fila ocupa el lugar que tendría si la soltaran ahora, y así las demás se apartan
  const fromIdx = drag ? rows.findIndex((r) => r.type === 'file' && r.id === drag.id) : -1
  const toIdx = drag?.over ? rows.findIndex((r) => r.type === 'file' && r.id === drag.over) : -1
  const slotOf = (i: number) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return i
    if (i === fromIdx) return toIdx
    if (fromIdx < toIdx && i > fromIdx && i <= toIdx) return i - 1
    if (fromIdx > toIdx && i >= toIdx && i < fromIdx) return i + 1
    return i
  }

  // la fila arrastrada no puede salir del render aunque su lugar original quede lejos de lo que se ve
  const heldRef = useRef(-1)
  heldRef.current = fromIdx
  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => ROW_H,
    overscan: 10,
    rangeExtractor: (range) => {
      const base = defaultRangeExtractor(range)
      const held = heldRef.current
      if (held < 0 || base.includes(held)) return base
      return [...base, held].sort((a, b) => a - b)
    },
  })

  return (
    <div ref={parent} data-lenis-prevent="" className="soft-scroll max-h-[min(42vh,380px)] min-h-[120px] overflow-y-auto" role="tree">
      <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
        {virt.getVirtualItems().map((v) => {
          const row = rows[v.index]
          const held = drag !== null && v.index === fromIdx
          const y = held ? drag.top : slotOf(v.index) * ROW_H
          return (
            <div
              key={row.type === 'folder' ? `f:${row.path}` : row.id}
              className="transition-transform duration-300 ease-out"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: ROW_H,
                transform: `translateY(${y}px)`,
                // la fila que se lleva en la mano sigue al puntero sin retraso y queda por encima de las demás
                transition: held ? 'none' : undefined,
                zIndex: held ? 20 : undefined,
              }}
            >
              {row.type === 'folder' ? (
                <FolderRow node={row} collapsed={!!collapsed[row.path]} />
              ) : (
                <FileRow id={row.id} depth={row.depth} onCompare={onCompare} onGrip={startDrag} onNudge={nudge} locked={locked} dragging={held} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------

const FolderRow = memo(function FolderRow({ node, collapsed }: { node: FolderNode; collapsed: boolean }) {
  const t = useT()
  const locale = useLocale()
  const toggleFolder = useWorkspace((s) => s.toggleFolder)
  const setSelected = useWorkspace((s) => s.setSelected)
  const removeItems = useWorkspace((s) => s.removeItems)

  const st = useWorkspace(
    useShallow((s) => {
      let selected = 0
      let before = 0
      let after = 0
      let finished = 0
      for (const id of node.ids) {
        const it = s.items[id]
        if (!it) continue
        if (it.selected) selected++
        before += it.size
        if (it.result) {
          finished++
          after += it.result.outSize
        } else after += it.size
      }
      return { selected, total: node.ids.length, before, after, finished }
    }),
  )

  const state: CheckState = st.selected === 0 ? 'none' : st.selected === st.total ? 'all' : 'some'
  const saved = st.finished === st.total && st.before > 0 ? 1 - st.after / st.before : 0

  return (
    <div
      role="treeitem"
      aria-expanded={!collapsed}
      onClick={() => toggleFolder(node.path)}
      className="fade-in flex h-full cursor-pointer items-center gap-2.5 border-b border-line/70 pr-4 transition-colors hover:bg-sunken/70"
      style={{ paddingLeft: 34 + node.depth * INDENT }}
    >
      <ChevronRight size={16} className={`shrink-0 text-muted transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`} />
      <Checkbox state={state} label={node.name} onChange={() => setSelected(node.ids, state !== 'all')} />
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        {collapsed ? <Folder size={19} /> : <FolderOpen size={19} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-semibold">{node.name}</p>
        <p className="text-xs text-muted">
          {t('work.folderCount', { count: node.ids.length })} · {formatBytes(st.before, locale)}
        </p>
      </div>
      {saved > 0.005 && <span className="fade-in chip bg-good-soft text-good">{t('status.saved', { percent: formatSaved(saved, locale) })}</span>}
      <RemoveButton label={t('work.removeFolder')} onRemove={() => removeItems(node.ids)} />
    </div>
  )
})

// ---------------------------------------------------------------------------------------

const FileRow = memo(function FileRow({
  id,
  depth,
  onCompare,
  onGrip,
  onNudge,
  locked,
  dragging,
}: {
  id: string
  depth: number
  onCompare: (id: string) => void
  onGrip: (e: React.PointerEvent, id: string) => void
  onNudge: (id: string, step: -1 | 1) => void
  locked: boolean
  dragging: boolean
}) {
  const t = useT()
  const item = useWorkspace((s) => s.items[id])
  const setSelected = useWorkspace((s) => s.setSelected)
  const removeItems = useWorkspace((s) => s.removeItems)
  if (!item) return null
  return (
    <div
      role="treeitem"
      onClick={() => item.status !== 'processing' && setSelected([item.id], !item.selected)}
      className={`fade-in group relative flex h-full items-center gap-2.5 border-b border-line/70 pl-2 pr-3 transition-[background-color,opacity,box-shadow] duration-300 hover:bg-sunken/70 ${
        dragging ? 'bg-surface shadow-card' : item.selected ? '' : 'opacity-55'
      }`}
    >
      <button
        type="button"
        disabled={locked}
        data-tip={t('work.reorder')}
        aria-label={t('work.reorder')}
        onPointerDown={(e) => onGrip(e, id)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
          e.preventDefault()
          onNudge(id, e.key === 'ArrowUp' ? -1 : 1)
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ marginRight: (depth + 1) * INDENT, touchAction: 'none' }}
        className="grid h-8 w-5 shrink-0 cursor-grab place-items-center rounded-md text-muted/70 transition-colors hover:bg-surface hover:text-ink active:cursor-grabbing disabled:pointer-events-none disabled:opacity-30"
      >
        <GripVertical size={16} />
      </button>
      <Checkbox
        state={item.selected ? 'all' : 'none'}
        label={item.name}
        disabled={item.status === 'processing'}
        onChange={() => setSelected([item.id], !item.selected)}
      />
      <Thumb item={item} />
      <FileInfo item={item} />
      {/* el estado, las acciones y el botón de eliminar forman un solo grupo, con los botones pegados entre sí */}
      <div className="flex shrink-0 items-center gap-1">
        <FileStatus item={item} onCompare={onCompare} />
        <RemoveButton label={t('work.remove')} disabled={item.status === 'processing'} onRemove={() => removeItems([item.id])} />
      </div>
    </div>
  )
})

function FileInfo({ item }: { item: Item }) {
  const t = useT()
  const locale = useLocale()
  const dims = item.result && item.result.width ? t('work.dimensions', { w: item.result.width, h: item.result.height }) : null
  const name = item.result?.name ?? item.name
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[0.95rem] font-medium" data-tip={item.path}>
        {name}
      </p>
      <p className="truncate text-xs text-muted">
        {KIND_LABEL[item.kind]}
        {dims && <span className="fade-in"> · {dims}</span>}
        {!item.result ? ` · ${formatBytes(item.size, locale)}` : ''}
      </p>
    </div>
  )
}

function FileStatus({ item, onCompare }: { item: Item; onCompare: (id: string) => void }) {
  const t = useT()
  const locale = useLocale()
  const errorText = t(`errors.${item.error ?? 'decode'}`)

  if (item.status === 'processing') {
    return (
      <span className="fade-in flex items-center gap-2 text-sm font-medium text-brand">
        <Loader2 size={16} className="spin" />
        <span className="hidden sm:inline">{t('status.processing')}</span>
      </span>
    )
  }
  if (item.status === 'error') {
    return (
      <span className="fade-in chip max-w-[46%] bg-bad-soft text-bad" data-tip={errorText}>
        <AlertCircle size={13} className="shrink-0" />
        <span className="truncate">{errorText}</span>
      </span>
    )
  }
  if ((item.status === 'done' || item.status === 'kept') && item.result) {
    const r = item.result
    const saved = 1 - r.outSize / item.size
    const note = r.note ? t(`notes.${r.note}`, { format: KIND_LABEL[r.outKind] }) : ''
    return (
      <div className="fade-in flex items-center gap-2" data-tip={note}>
        <span className="hidden items-center gap-1.5 text-xs text-muted md:flex">
          {formatBytes(item.size, locale)}
          <ArrowRight size={12} />
          <b className="text-ink">{formatBytes(r.outSize, locale)}</b>
        </span>
        {item.status === 'done' ? (
          <span className="chip bg-good-soft text-good">{t('status.saved', { percent: formatSaved(saved, locale) })}</span>
        ) : (
          <span className="chip bg-sunken text-muted">{t('status.kept')}</span>
        )}
        <div className="flex items-center gap-1">
          {r.blob && (
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand"
              data-tip={t('work.compare')}
              aria-label={t('work.compare')}
              onClick={(e) => {
                e.stopPropagation()
                onCompare(item.id)
              }}
            >
              <Columns2 size={16} />
            </button>
          )}
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand"
            data-tip={t('work.downloadOne')}
            aria-label={t('work.downloadOne')}
            onClick={(e) => {
              e.stopPropagation()
              downloadOne(item)
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    )
  }
  return <span className="fade-in text-xs text-muted">{formatBytes(item.size, locale)}</span>
}
