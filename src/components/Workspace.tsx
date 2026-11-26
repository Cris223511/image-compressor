import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ImagePlus, Loader2, SlidersHorizontal, Square, Trash2, TriangleAlert, Zap } from 'lucide-react'
import { TreeList } from './TreeList'
import { ResultBanner } from './ResultBanner'
import { SkippedPanel } from './SkippedPanel'
import { SettingsPanel } from './SettingsPanel'
import { ComparePanel } from './ComparePanel'
import type { usePickers } from './usePickers'
import { useWorkspace } from '../store/workspace'
import { buildTree, folderPaths } from '../lib/tree'
import { formatBytes } from '../lib/format'
import { MAX_IMAGES } from '../config/limits'
import { useLocale, useT } from '../i18n'

const barBtn = 'rounded-lg px-2.5 py-1.5 hover:bg-surface hover:text-ink'

export function Workspace({ pickers }: { pickers: ReturnType<typeof usePickers> }) {
  const t = useT()
  const locale = useLocale()
  const order = useWorkspace((s) => s.order)
  const phase = useWorkspace((s) => s.phase)
  const scanning = useWorkspace((s) => s.scanning)
  const skipped = useWorkspace((s) => s.skipped)
  const persistFailed = useWorkspace((s) => s.persistFailed)
  const run = useWorkspace((s) => s.run)
  const cancel = useWorkspace((s) => s.cancel)
  const clear = useWorkspace((s) => s.clear)
  const setSelected = useWorkspace((s) => s.setSelected)
  const setCollapsedAll = useWorkspace((s) => s.setCollapsedAll)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [compareId, setCompareId] = useState<string | null>(null)

  const limitHit = skipped.some((x) => x.category === 'limit')

  // los contadores se calculan en el selector: el componente solo se vuelve a pintar si cambian
  const stats = useWorkspace(
    useShallow((s) => {
      let selected = 0
      let bytes = 0
      let todo = 0
      let finished = 0
      for (const id of s.order) {
        const it = s.items[id]
        if (!it.selected) continue
        selected++
        bytes += it.size
        if (it.status === 'done' || it.status === 'kept' || it.status === 'error') finished++
        else todo++
      }
      return { selected, bytes, todo, finished }
    }),
  )

  // el árbol solo cambia cuando cambia la lista, no con cada avance de la compresión
  const tree = useMemo(() => {
    const items = useWorkspace.getState().items
    return buildTree(order.map((id) => ({ id, path: items[id].path })))
  }, [order])
  const folders = useMemo(() => folderPaths(tree), [tree])

  const running = phase === 'running'
  const total = stats.finished + stats.todo
  const percent = total ? Math.round((stats.finished / total) * 100) : 0
  const hasImages = order.length > 0

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {phase === 'done' && <ResultBanner onSettings={() => setSettingsOpen(true)} />}

      {limitHit && (
        <div className="rise mb-4 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p>{t('work.limitHit', { max: MAX_IMAGES })}</p>
        </div>
      )}

      {/* cabecera con el resumen y las acciones generales */}
      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">{t('work.treeTitle')}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {scanning ? (
              <span className="flex items-center gap-1.5 text-brand">
                <Loader2 size={14} className="spin" />
                {t('work.scanning')}
              </span>
            ) : (
              <>
                <span>{t('work.images', { count: order.length })}</span>
                <span aria-hidden>·</span>
                <span>{t('work.selected', { count: stats.selected })}</span>
                <span aria-hidden>·</span>
                <span>
                  {t('work.totalWeight')}: <b className="text-ink">{formatBytes(stats.bytes, locale)}</b>
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={pickers.openFiles} disabled={running || scanning}>
            <ImagePlus size={16} /> {t('work.addMore')}
          </button>
          <button className="btn-ghost" onClick={() => setSettingsOpen(true)}>
            <SlidersHorizontal size={16} /> {t('work.settings')}
          </button>
          <button className="btn-ghost" onClick={clear} disabled={scanning}>
            <Trash2 size={16} /> {t('work.clear')}
          </button>
        </div>
      </div>

      {hasImages ? (
        <div className="rise mt-4 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="flex flex-wrap items-center gap-1 border-b border-line bg-sunken/60 px-3 py-2 text-[0.8rem] font-semibold text-muted">
            <button className={barBtn} onClick={() => setSelected(order, true)} disabled={running}>
              {t('work.selectAll')}
            </button>
            <button className={barBtn} onClick={() => setSelected(order, false)} disabled={running}>
              {t('work.selectNone')}
            </button>
            {folders.length > 0 && (
              <>
                <span className="mx-1 h-4 w-px bg-line" aria-hidden />
                <button className={barBtn} onClick={() => setCollapsedAll(folders, false)}>
                  {t('work.expandAll')}
                </button>
                <button className={barBtn} onClick={() => setCollapsedAll(folders, true)}>
                  {t('work.collapseAll')}
                </button>
              </>
            )}
          </div>
          <TreeList tree={tree} onCompare={setCompareId} />
        </div>
      ) : (
        !scanning && (
          <p className="rise mt-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center text-muted">{t('work.onlySkipped')}</p>
        )
      )}

      {skipped.length > 0 && <SkippedPanel />}

      <p className={`mt-6 text-center text-xs ${persistFailed ? 'text-warn' : 'text-muted'}`}>
        {persistFailed ? t('work.saveFailed') : t('work.saved')}
      </p>

      {/* barra de acción fija abajo: botón de comprimir o el avance */}
      {hasImages && phase !== 'done' && (
        <div className="sticky bottom-4 z-20 mt-6">
          <div key={running ? 'run' : 'idle'} className="fade-in mx-auto max-w-2xl rounded-3xl border border-line bg-surface p-3 shadow-lift">
            {running ? (
              <div className="flex items-center gap-4 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex justify-between text-sm font-semibold">
                    <span>{t('work.compressing')}</span>
                    <span className="text-muted">{t('work.progress', { done: stats.finished, total })}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${percent}%`, backgroundImage: 'linear-gradient(90deg,#1456f0,#1aaeff)' }}
                    />
                    <div className="sheen absolute inset-0" />
                  </div>
                </div>
                <button className="btn-ghost shrink-0" onClick={cancel}>
                  <Square size={14} /> {t('work.cancel')}
                </button>
              </div>
            ) : (
              <button className="btn-primary h-14 w-full text-lg" disabled={stats.todo === 0 || scanning} onClick={run}>
                <Zap size={20} />
                {stats.todo === 0 ? t('work.nothingSelected') : t('work.compress', { count: stats.todo })}
              </button>
            )}
          </div>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {compareId && <ComparePanel id={compareId} onClose={() => setCompareId(null)} />}
    </section>
  )
}
