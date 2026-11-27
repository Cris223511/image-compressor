import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Minus, Plus, Scan, X } from 'lucide-react'
import { CompareStage, MAX_ZOOM, useCompareView, zoomPercent, zoomToActual, type Natural } from './CompareStage'
import type { Item } from '../store/workspace'
import { downloadOne } from '../lib/download'
import { useT } from '../i18n'

const BTN = 'grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-40'
/** el espacio que queda libre arriba y abajo para que la imagen no tape la barra de herramientas */
const ROOM = '7rem'

/** vista a pantalla completa de la comparación, con el fondo hecho del propio resultado desenfocado */
export function CompareFull({
  item,
  urls,
  natural,
  initialPos,
  onClosed,
}: {
  item: Item
  urls: { a: string; b: string }
  natural: Natural
  initialPos: number
  onClosed: () => void
}) {
  const t = useT()
  const cv = useCompareView(initialPos)
  const [shown, setShown] = useState(false)
  const closing = useRef(false)
  const root = useRef<HTMLDivElement>(null)

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

  // con la vista abierta la página de fondo no debe desplazarse
  useEffect(() => {
    const el = root.current
    if (!el) return
    const stop = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const { zoomAt, fit, setPos } = cv
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  const aspect = natural ? natural.w / natural.h : 4 / 3
  const tall = `(100vh - ${ROOM})`

  return createPortal(
    <div ref={root} data-lenis-prevent="" role="dialog" aria-modal="true" aria-label={t('compare.title')} className="fixed inset-0 z-[60]">
      {/* el fondo es la propia imagen, muy desenfocada y oscurecida para que lo de encima se lea bien */}
      <div aria-hidden className={`absolute inset-0 overflow-hidden bg-neutral-900 transition-opacity duration-500 ${shown ? 'opacity-100' : 'opacity-0'}`}>
        <img src={urls.b} alt="" draggable={false} className="h-full w-full scale-125 object-cover blur-[64px]" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <div className="absolute inset-0 grid place-items-center px-4 pb-6 pt-20 sm:px-10" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div
          className={`pointer-events-none w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            shown ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-0'
          }`}
        >
          <CompareStage
            cv={cv}
            item={item}
            urls={urls}
            natural={natural}
            className="pointer-events-auto shadow-2xl"
            style={{ maxHeight: `calc${tall}`, maxWidth: '100%', width: `min(100%, calc(${tall} * ${aspect}))` }}
          />
        </div>
      </div>

      <div
        className={`absolute right-4 top-4 flex items-center gap-0.5 rounded-full bg-surface/90 p-1.5 shadow-lg backdrop-blur transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:right-6 sm:top-5 ${
          shown ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
        }`}
      >
        <button className={BTN} onClick={() => zoomAt(1 / 1.4)} disabled={!cv.zoomed} aria-label={t('compare.zoomOut')} data-tip={t('compare.zoomOut')}>
          <Minus size={17} />
        </button>
        <button
          className="h-9 min-w-[3.6rem] rounded-full px-2 text-sm font-semibold tabular-nums text-ink transition-colors hover:bg-sunken hover:text-brand"
          onClick={() => zoomToActual(cv, natural)}
          data-tip={t('compare.actual')}
        >
          {zoomPercent(cv, natural)} %
        </button>
        <button className={BTN} onClick={() => zoomAt(1.4)} disabled={cv.view.s >= MAX_ZOOM} aria-label={t('compare.zoomIn')} data-tip={t('compare.zoomIn')}>
          <Plus size={17} />
        </button>
        <button className={`${BTN} ${cv.zoomed ? 'text-brand' : ''}`} onClick={fit} aria-label={t('compare.fit')} data-tip={t('compare.fit')}>
          <Scan size={17} />
        </button>
        <button className={BTN} onClick={() => downloadOne(item)} aria-label={t('compare.download')} data-tip={t('compare.download')}>
          <Download size={17} />
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button className={BTN} onClick={close} aria-label={t('compare.close')} data-tip={t('compare.close')}>
          <X size={19} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
