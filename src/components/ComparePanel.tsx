import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, MoveHorizontal, Minus, Plus, X } from 'lucide-react'
import { FadeImg } from './FadeImg'
import { useWorkspace } from '../store/workspace'
import { originalBlob } from '../lib/download'
import { formatBytes } from '../lib/format'
import { useLocale, useT } from '../i18n'

const MAX_ZOOM = 12

interface View {
  /** aumento respecto a la imagen ajustada a la ventana */
  s: number
  x: number
  y: number
}
const FIT: View = { s: 1, x: 0, y: 0 }

/** mantiene la imagen cubriendo toda la ventana, sin dejar huecos al arrastrar */
function clampView(v: View, w: number, h: number): View {
  const s = Math.min(MAX_ZOOM, Math.max(1, v.s))
  return { s, x: Math.min(0, Math.max(w * (1 - s), v.x)), y: Math.min(0, Math.max(h * (1 - s), v.y)) }
}

/** comparador con deslizador que muestra el original a la izquierda y la comprimida a la derecha, con zoom y arrastre */
export function ComparePanel({ id, onClose: onClosed }: { id: string; onClose: () => void }) {
  const t = useT()
  const locale = useLocale()
  const item = useWorkspace((s) => s.items[id])
  const [shown, setShown] = useState(false)
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
  const [pos, setPos] = useState(50)
  // las dimensiones ya se conocen por el resultado, así la ventana no cambia de tamaño cuando carga la imagen
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    item?.result && item.result.width > 0 ? { w: item.result.width, h: item.result.height } : null,
  )
  const [view, setView] = useState<View>(FIT)
  const [dragging, setDragging] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

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

  /** acerca o aleja manteniendo fijo el punto de la imagen que está bajo el cursor */
  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = cx ?? r.width / 2
    const py = cy ?? r.height / 2
    const v = viewRef.current
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s * factor))
    const k = s / v.s
    setView(clampView({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, r.width, r.height))
  }, [])

  // la rueda hace zoom en el comparador sin desplazar la página, así que el oyente no puede ser pasivo
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, urls])

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 3))
      if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 3))
      if (e.key === '+' || e.key === '=') zoomAt(1.4)
      if (e.key === '-') zoomAt(1 / 1.4)
      if (e.key === '0') setView(FIT)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, zoomAt])

  if (!item?.result) return null

  const aspect = natural ? natural.w / natural.h : 4 / 3
  const zoomed = view.s > 1.001

  // al arrastrar, o se mueve el deslizador (con la manija, o en cualquier punto si no hay zoom) o se desplaza la imagen
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const onHandle = (e.target as HTMLElement).closest('[data-handle]') !== null
    if (!zoomed || onHandle) {
      move(e.clientX)
      el.dataset.mode = 'slider'
      return
    }
    el.dataset.mode = 'pan'
    el.dataset.px = String(e.clientX)
    el.dataset.py = String(e.clientY)
    el.dataset.vx = String(view.x)
    el.dataset.vy = String(view.y)
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    const el = e.currentTarget
    if (el.dataset.mode === 'slider') move(e.clientX)
    else if (el.dataset.mode === 'pan') {
      const r = el.getBoundingClientRect()
      setView(
        clampView(
          { s: viewRef.current.s, x: Number(el.dataset.vx) + e.clientX - Number(el.dataset.px), y: Number(el.dataset.vy) + e.clientY - Number(el.dataset.py) },
          r.width,
          r.height,
        ),
      )
    }
  }
  const onPointerUp = () => setDragging(false)

  // un doble clic acerca hasta el tamaño real o vuelve a ajustar la imagen
  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    const r = e.currentTarget.getBoundingClientRect()
    if (zoomed) setView(FIT)
    else zoomAt(3, e.clientX - r.left, e.clientY - r.top)
  }

  // el porcentaje es respecto al tamaño real de la imagen, donde 100 % es un píxel por píxel
  const shownWidth = box.current?.getBoundingClientRect().width ?? 0
  const actual = natural && shownWidth ? Math.round(view.s * (shownWidth / natural.w) * 100) : Math.round(view.s * 100)
  const goActual = () => {
    if (natural && shownWidth) zoomAt(Math.max(1, natural.w / shownWidth) / view.s)
  }

  const layer: React.CSSProperties = {
    transformOrigin: '0 0',
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
    transition: dragging ? 'none' : 'transform 0.16s ease-out',
    willChange: 'transform',
  }

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
            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken disabled:opacity-40" onClick={() => zoomAt(1 / 1.4)} disabled={!zoomed} aria-label={t('compare.zoomOut')} title={t('compare.zoomOut')}>
              <Minus size={17} />
            </button>
            <button
              className="h-9 min-w-[3.6rem] rounded-xl px-2 text-sm font-semibold tabular-nums text-muted hover:bg-sunken hover:text-brand"
              onClick={goActual}
              title={t('compare.actual')}
            >
              {actual} %
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken disabled:opacity-40" onClick={() => zoomAt(1.4)} disabled={view.s >= MAX_ZOOM} aria-label={t('compare.zoomIn')} title={t('compare.zoomIn')}>
              <Plus size={17} />
            </button>
            <button
              className={`grid h-9 w-9 place-items-center rounded-xl hover:bg-sunken ${zoomed ? 'text-brand' : 'text-muted'}`}
              onClick={() => setView(FIT)}
              aria-label={t('compare.fit')}
              title={t('compare.fit')}
            >
              <Maximize2 size={17} />
            </button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken" onClick={close} aria-label={t('compare.close')}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-sunken p-3 sm:p-5">
          <div
            ref={box}
            data-lenis-prevent=""
            className={`checker relative mx-auto touch-none select-none overflow-hidden rounded-xl ${zoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-ew-resize'}`}
            style={{ aspectRatio: aspect, maxHeight: '64vh', maxWidth: '100%', width: `min(100%, calc(64vh * ${aspect}))` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            {!urls ? (
              <div className="fade-in absolute inset-0 grid place-items-center text-muted">
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="spin" /> {t('compare.loading')}
                </span>
              </div>
            ) : (
              <>
                <div className="absolute inset-0" style={layer}>
                  <FadeImg
                    src={urls.b}
                    alt={t('compare.compressed')}
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-fill"
                    onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  />
                </div>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                  <div className="absolute inset-0" style={layer}>
                    <FadeImg src={urls.a} alt={t('compare.original')} draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" style={{ left: `${pos}%` }}>
                  <span
                    data-handle=""
                    className="pointer-events-auto absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-brand shadow-lg"
                  >
                    <MoveHorizontal size={18} />
                  </span>
                </div>
                <Label side="left" text={`${t('compare.original')} · ${formatBytes(item.size, locale)}`} />
                <Label side="right" text={`${t('compare.compressed')} · ${formatBytes(item.result.outSize, locale)}`} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ side, text }: { side: 'left' | 'right'; text: string }) {
  return (
    <span
      className={`pointer-events-none absolute top-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      {text}
    </span>
  )
}
