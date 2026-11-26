import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ImagePlus, Loader2, SlidersHorizontal, Square, Trash2, TriangleAlert, Zap } from 'lucide-react'
import { TreeList } from './TreeList'
import { Collapse } from './Collapse'
import { ResultBanner } from './ResultBanner'
import { SkippedPanel } from './SkippedPanel'
import { SettingsPanel } from './SettingsPanel'
import { ComparePanel } from './ComparePanel'
import type { usePickers } from './usePickers'
import { useConsent } from '../store/consent'
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
  const keepsSession = useConsent((s) => s.session)
  const run = useWorkspace((s) => s.run)
  const cancel = useWorkspace((s) => s.cancel)
  const clear = useWorkspace((s) => s.clear)
  const setSelected = useWorkspace((s) => s.setSelected)
  const setCollapsedAll = useWorkspace((s) => s.setCollapsedAll)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [compareId, setCompareId] = useState<string | null>(null)

  const limitHit = skipped.some((x) => x.category === 'limit')

  // los contadores se calculan en el selector, así que el componente solo se vuelve a pintar cuando cambian
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
      {/* el resumen se abre y se cierra deslizando, y conserva sus cifras mientras se cierra */}
      <Collapse open={phase === 'done'}>
        <ResultBanner open={phase === 'done'} onSettings={() => setSettingsOpen(true)} />
      </Collapse>

      <Collapse open={limitHit}>
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p>{t('work.limitHit', { max: MAX_IMAGES })}</p>
        </div>
      </Collapse>

      {/* cabecera con el resumen y las acciones generales */}
      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">{t('work.treeTitle')}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {scanning ? (
              <span key="scan" className="fade-in flex items-center gap-1.5 text-brand">
                <Loader2 size={14} className="spin" />
                {t('work.scanning')}
              </span>
            ) : (
              <span key="stats" className="fade-in flex flex-wrap items-center gap-x-2">
                <span>{t('work.images', { count: order.length })}</span>
                <span aria-hidden>·</span>
                <span>{t('work.selected', { count: stats.selected })}</span>
                <span aria-hidden>·</span>
                <span>
                  {t('work.totalWeight')}: <b className="text-ink">{formatBytes(stats.bytes, locale)}</b>
                </span>
              </span>
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
              <span className="fade-in inline-flex items-center gap-1">
                <span className="mx-1 h-4 w-px bg-line" aria-hidden />
                <button className={barBtn} onClick={() => setCollapsedAll(folders, false)}>
                  {t('work.expandAll')}
                </button>
                <button className={barBtn} onClick={() => setCollapsedAll(folders, true)}>
                  {t('work.collapseAll')}
                </button>
              </span>
            )}
          </div>
          <TreeList tree={tree} onCompare={setCompareId} />
        </div>
      ) : (
        !scanning && (
          <p className="rise mt-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center text-muted">{t('work.onlySkipped')}</p>
        )
      )}

      {/* justo debajo de la lista van el botón de comprimir y el avance, uno sobre el otro en el mismo sitio */}
      <Collapse open={hasImages && phase !== 'done'}>
        <div className="mt-5 grid pb-6" aria-live="polite">
          <div
            className={`col-start-1 row-start-1 flex items-center transition-opacity duration-500 ${running ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
            {...(running ? ({ inert: '' } as object) : {})}
          >
            <button className="btn-primary h-14 w-full text-lg" disabled={stats.todo === 0 || scanning} onClick={run}>
              <Zap size={20} />
              {stats.todo === 0 ? t('work.nothingSelected') : t('work.compress', { count: stats.todo })}
            </button>
          </div>
          <div
            className={`col-start-1 row-start-1 transition-opacity duration-500 ${running ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            {...(running ? {} : ({ inert: '' } as object))}
          >
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <Loader2 size={22} className="spin" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-tight">{t('work.compressing')}</p>
                  <p className="text-sm text-muted">{t('work.progress', { done: stats.finished, total })}</p>
                </div>
                <p className="font-display text-3xl font-extrabold tabular-nums text-brand">{percent}%</p>
                <button className="btn-ghost shrink-0" onClick={cancel}>
                  <Square size={14} /> {t('work.cancel')}
                </button>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%`, backgroundImage: 'linear-gradient(90deg,#1456f0,#1aaeff)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </Collapse>

      {skipped.length > 0 && <SkippedPanel />}

      <p key={persistFailed ? 'fail' : keepsSession ? 'ok' : 'off'} className={`fade-in mt-6 text-center text-xs ${persistFailed ? 'text-warn' : 'text-muted'}`}>
        {persistFailed ? t('work.saveFailed') : keepsSession ? t('work.saved') : t('work.notSaved')}
        {!persistFailed && !keepsSession && (
          <>
            {' '}
            <Link to="/cookies" className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand">
              {t('work.notSavedLink')}
            </Link>
          </>
        )}
      </p>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {compareId && <ComparePanel id={compareId} onClose={() => setCompareId(null)} />}
    </section>
  )
}
