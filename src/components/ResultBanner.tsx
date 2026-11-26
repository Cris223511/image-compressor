import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useWorkspace } from '../store/workspace'
import { downloadAllZip } from '../lib/download'
import { useCountUp } from '../lib/useCountUp'
import { formatBytes, formatSaved } from '../lib/format'
import { useLocale, useT } from '../i18n'

export function ResultBanner({ open, onSettings }: { open: boolean; onSettings: () => void }) {
  const t = useT()
  const locale = useLocale()
  const items = useWorkspace((s) => s.items)
  const order = useWorkspace((s) => s.order)
  const redo = useWorkspace((s) => s.redo)
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null)

  const live = useMemo(() => {
    let before = 0
    let after = 0
    let done = 0
    let kept = 0
    let failed = 0
    const downloadable = []
    for (const id of order) {
      const it = items[id]
      if (!it.selected) continue
      if (it.status === 'error') {
        failed++
        continue
      }
      if (!it.result) continue
      before += it.size
      after += it.result.outSize
      if (it.status === 'done') done++
      else kept++
      downloadable.push(it)
    }
    return { before, after, done, kept, failed, downloadable }
  }, [items, order])
  // al cerrarse (por ejemplo al repetir) se muestran las últimas cifras, no un resumen vacío
  const frozen = useRef(live)
  if (open) frozen.current = live
  const s = frozen.current

  const saved = s.before > 0 ? 1 - s.after / s.before : 0
  const shown = useCountUp(Math.round(saved * 100))
  const nothing = s.done === 0

  const onDownload = async () => {
    setZipping({ done: 0, total: s.downloadable.length })
    try {
      await downloadAllZip(s.downloadable, (done, total) => setZipping({ done, total }))
    } finally {
      setZipping(null)
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className="relative p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(50% 120% at 0% 0%, rgb(var(--good) / 0.12), transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-good">
              <CheckCircle2 size={18} /> {t('result.title')}
            </p>
            {nothing ? (
              <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t('result.nothingSaved')}</p>
            ) : (
              <>
                <p className="mt-1 font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
                  <span className="text-good">-{Math.round(shown)}%</span>
                </p>
                <p className="mt-3 text-lg font-semibold">{t('result.saved', { percent: formatSaved(saved, locale) })}</p>
                <p className="mt-0.5 text-muted">
                  {t('result.detail', { before: formatBytes(s.before, locale), after: formatBytes(s.after, locale) })}
                </p>
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {s.done > 0 && <span className="chip bg-good-soft text-good">{t('result.count', { count: s.done })}</span>}
              {s.kept > 0 && <span className="chip bg-sunken text-muted">{t('result.unchanged', { count: s.kept })}</span>}
              {s.failed > 0 && <span className="chip bg-bad-soft text-bad">{t('result.failed', { count: s.failed })}</span>}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[16rem]">
            <button className="btn-primary h-14 text-base" onClick={onDownload} disabled={!!zipping || s.downloadable.length === 0}>
              {zipping ? <Loader2 size={20} className="spin" /> : <Download size={20} />}
              {zipping ? t('work.downloading', zipping) : t('work.downloadAll')}
            </button>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={redo}>
                <RotateCcw size={15} /> {t('work.again')}
              </button>
              <button className="btn-ghost" onClick={onSettings} aria-label={t('work.settings')} title={t('work.settings')}>
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
