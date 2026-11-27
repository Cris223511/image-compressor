import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, Scan, X } from 'lucide-react'
import { CompareFull } from './CompareFull'
import { CompareStage, MAX_ZOOM, useCompareView, zoomPercent, zoomToActual, type Natural } from './CompareStage'
import { useWorkspace } from '../store/workspace'
import { originalBlob } from '../lib/download'
import { useT } from '../i18n'

/** comparador con deslizador que muestra el original a la izquierda y la comprimida a la derecha, con zoom y arrastre */
export function ComparePanel({ id, onClose: onClosed }: { id: string; onClose: () => void }) {
  const t = useT()
  const item = useWorkspace((s) => s.items[id])
  const [shown, setShown] = useState(false)
  const [full, setFull] = useState(false)
  const closing = useRef(false)

  // se abre en el cuadro siguiente para que la transición arranque desde el estado cerrado
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])
  // al cerrar primero se desvanece y solo después se desmonta
  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setShown(false)
    window.setTimeout(onClosed, 450)
  }, [onClosed])

  const [urls, setUrls] = useState<{ a: string; b: string } | null>(null)
  // las dimensiones ya se conocen por el resultado, así la ventana no cambia de tamaño cuando carga la imagen
  const [natural, setNatural] = useState<Natural>(item?.result && item.result.width > 0 ? { w: item.result.width, h: item.result.height } : null)
  const cv = useCompareView()

  useEffect(() => {
    let alive = true
    let a = ''
    let b = ''
    ;(async () => {
      if (!item?.result?.blob) return
      const orig = await originalBlob(item)
      if (!alive) return
      a = URL.createObjectURL(orig)
      b = URL.createObjectURL(item.result.blob)
      setUrls({ a, b })
    })()
    return () => {
      alive = false
      if (a) URL.revokeObjectURL(a)
      if (b) URL.revokeObjectURL(b)
    }
    // solo importa al abrir, ya que el resultado no cambia mientras se mira
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // con la pantalla completa abierta, las teclas son de ella y no de este comparador
  const fullRef = useRef(full)
  fullRef.current = full
  const { zoomAt, fit, setPos } = cv
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (fullRef.current) return
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 3))
      if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 3))
      if (e.key === '+' || e.key === '=') zoomAt(1.4)
      if (e.key === '-') zoomAt(1 / 1.4)
      if (e.key === '0') fit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, zoomAt, fit, setPos])

  if (!item?.result) return null

  const aspect = natural ? natural.w / natural.h : 4 / 3
  const tool = 'grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken disabled:opacity-40'

  return (
    <div
      className={`veil fixed inset-0 z-50 grid place-items-center p-3 sm:p-6 ${shown ? 'on' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-label={t('compare.title')}
    >
      <div
        className={`flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-[0.96] opacity-0'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">{t('compare.title')}</p>
            <p className="truncate text-sm text-muted">{item.path}</p>
          </div>
          <div className="flex items-center gap-1">
            <button className={tool} onClick={() => zoomAt(1 / 1.4)} disabled={!cv.zoomed} aria-label={t('compare.zoomOut')} data-tip={t('compare.zoomOut')}>
              <Minus size={17} />
            </button>
            <button
              className="h-9 min-w-[3.6rem] rounded-xl px-2 text-sm font-semibold tabular-nums text-muted hover:bg-sunken hover:text-brand"
              onClick={() => zoomToActual(cv, natural)}
              data-tip={t('compare.actual')}
            >
              {zoomPercent(cv, natural)} %
            </button>
            <button className={tool} onClick={() => zoomAt(1.4)} disabled={cv.view.s >= MAX_ZOOM} aria-label={t('compare.zoomIn')} data-tip={t('compare.zoomIn')}>
              <Plus size={17} />
            </button>
            <button className={`${tool} ${cv.zoomed ? 'text-brand' : ''}`} onClick={fit} aria-label={t('compare.fit')} data-tip={t('compare.fit')}>
              <Scan size={17} />
            </button>
            <button className={tool} onClick={() => setFull(true)} disabled={!urls} aria-label={t('compare.fullscreen')} data-tip={t('compare.fullscreen')}>
              <Maximize2 size={17} />
            </button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button className={tool} onClick={close} aria-label={t('compare.close')} data-tip={t('compare.close')}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-sunken p-3 sm:p-5">
          <CompareStage
            cv={cv}
            item={item}
            urls={urls}
            natural={natural}
            onNatural={setNatural}
            style={{ maxHeight: '64vh', maxWidth: '100%', width: `min(100%, calc(64vh * ${aspect}))` }}
          />
        </div>
      </div>

      {full && urls && <CompareFull item={item} urls={urls} natural={natural} initialPos={cv.pos} onClosed={() => setFull(false)} />}
    </div>
  )
}
