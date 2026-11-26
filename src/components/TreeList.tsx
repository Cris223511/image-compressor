import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null)
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
      let over: string | null = null
      let y = e.clientY
      setDrag({ id, over })
      document.body.style.cursor = 'grabbing'

      // en cada cuadro se mira qué fila hay bajo el puntero y se desplaza la lista si está en un borde
      let frame = 0
      const tick = () => {
        const rect = host.getBoundingClientRect()
        if (y < rect.top + 36) host.scrollTop -= 10
        else if (y > rect.bottom - 36) host.scrollTop += 10
        const row = rowsRef.current[Math.floor((y - rect.top + host.scrollTop) / ROW_H)]
        const next = row && row.type === 'file' && row.id !== id && dirOf(row.id) === dir ? row.id : null
        if (next !== over) {
          over = next
          setDrag({ id, over })
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

  // la marca de dónde caerá lo arrastrado queda debajo de la fila si baja y encima si sube
  const order = useWorkspace((s) => s.order)
  const dropSide = (id: string): 'above' | 'below' | null => {
    if (!drag || drag.over !== id) return null
    return order.indexOf(drag.id) < order.indexOf(id) ? 'below' : 'above'
  }

  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => ROW_H,
    overscan: 10,
  })

  return (
    <div ref={parent} data-lenis-prevent="" className="soft-scroll max-h-[min(42vh,380px)] min-h-[120px] overflow-y-auto" role="tree">
      <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
        {virt.getVirtualItems().map((v) => {
          const row = rows[v.index]
          return (
            <div
              key={row.type === 'folder' ? `f:${row.path}` : row.id}
              className="transition-transform duration-300 ease-out"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H, transform: `translateY(${v.start}px)` }}
            >
              {row.type === 'folder' ? (
                <FolderRow node={row} collapsed={!!collapsed[row.path]} />
              ) : (
                <FileRow id={row.id} depth={row.depth} onCompare={onCompare} onGrip={startDrag} locked={locked} dragging={drag?.id === row.id} drop={dropSide(row.id)} />
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
      <RemoveButton label={t('work.removeFolder')} onConfirm={() => removeItems(node.ids)} />
    </div>
  )
})

// ---------------------------------------------------------------------------------------

const FileRow = memo(function FileRow({
  id,
  depth,
  onCompare,
  onGrip,
  locked,
  dragging,
  drop,
}: {
  id: string
  depth: number
  onCompare: (id: string) => void
  onGrip: (e: React.PointerEvent, id: string) => void
  locked: boolean
  dragging: boolean
  drop: 'above' | 'below' | null
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
      className={`fade-in group relative flex h-full items-center gap-2.5 border-b border-line/70 pl-2 pr-3 transition-[background-color,opacity] duration-300 hover:bg-sunken/70 ${
        dragging ? 'bg-sunken opacity-60' : item.selected ? '' : 'opacity-55'
      }`}
    >
      {drop && <span aria-hidden className={`pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-brand ${drop === 'above' ? '-top-px' : '-bottom-px'}`} />}
      <button
        type="button"
        disabled={locked}
        title={t('work.reorder')}
        aria-label={t('work.reorder')}
        onPointerDown={(e) => onGrip(e, id)}
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
      <FileStatus item={item} onCompare={onCompare} />
      <RemoveButton label={t('work.remove')} disabled={item.status === 'processing'} onConfirm={() => removeItems([item.id])} />
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
      <p className="truncate text-[0.95rem] font-medium" title={item.path}>
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
      <span className="fade-in chip max-w-[46%] bg-bad-soft text-bad" title={errorText}>
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
      <div className="fade-in flex items-center gap-2" title={note}>
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
        <div className="flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          {r.blob && (
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand"
              title={t('work.compare')}
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
            title={t('work.downloadOne')}
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
