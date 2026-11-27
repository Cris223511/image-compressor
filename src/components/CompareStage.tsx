import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MoveHorizontal } from 'lucide-react'
import { FadeImg } from './FadeImg'
import type { Item } from '../store/workspace'
import { formatBytes } from '../lib/format'
import { useLocale, useT } from '../i18n'

export const MAX_ZOOM = 12

export interface View {
  /** aumento respecto a la imagen ajustada a la ventana */
  s: number
  x: number
  y: number
}
export const FIT: View = { s: 1, x: 0, y: 0 }

/** mantiene la imagen cubriendo toda la ventana, sin dejar huecos al arrastrar */
function clampView(v: View, w: number, h: number): View {
  const s = Math.min(MAX_ZOOM, Math.max(1, v.s))
  return { s, x: Math.min(0, Math.max(w * (1 - s), v.x)), y: Math.min(0, Math.max(h * (1 - s), v.y)) }
}

export type Natural = { w: number; h: number } | null

/** lo que comparten el comparador pequeño y la pantalla completa: deslizador, zoom con la rueda y arrastre de la imagen */
export function useCompareView(initialPos = 50) {
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>(FIT)
  const [pos, setPos] = useState(initialPos)
  const [dragging, setDragging] = useState(false)
  const viewRef = useRef(view)
  viewRef.current = view
  const zoomed = view.s > 1.001

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

  // la rueda hace zoom sin desplazar la página, así que el oyente no puede ser pasivo
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
  }, [zoomAt])

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

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

  const fit = useCallback(() => setView(FIT), [])

  return { box, view, pos, setPos, dragging, zoomed, zoomAt, fit, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onDoubleClick } }
}

export type CompareView = ReturnType<typeof useCompareView>

/** el porcentaje es respecto al tamaño real de la imagen, donde 100 % es un píxel por píxel */
export function zoomPercent(cv: CompareView, natural: Natural): number {
  const width = cv.box.current?.getBoundingClientRect().width ?? 0
  return natural && width ? Math.round(cv.view.s * (width / natural.w) * 100) : Math.round(cv.view.s * 100)
}

/** acerca hasta que cada píxel de la imagen ocupe un píxel de la pantalla */
export function zoomToActual(cv: CompareView, natural: Natural) {
  const width = cv.box.current?.getBoundingClientRect().width ?? 0
  if (natural && width) cv.zoomAt(Math.max(1, natural.w / width) / cv.view.s)
}

/** el recuadro con las dos imágenes, el deslizador y las etiquetas de peso */
export function CompareStage({
  cv,
  item,
  urls,
  natural,
  onNatural,
  style,
  className = '',
}: {
  cv: CompareView
  item: Item
  urls: { a: string; b: string } | null
  natural: Natural
  onNatural?: (n: { w: number; h: number }) => void
  style: React.CSSProperties
  className?: string
}) {
  const t = useT()
  const locale = useLocale()
  const aspect = natural ? natural.w / natural.h : 4 / 3
  const layer: React.CSSProperties = {
    transformOrigin: '0 0',
    transform: `translate(${cv.view.x}px, ${cv.view.y}px) scale(${cv.view.s})`,
    transition: cv.dragging ? 'none' : 'transform 0.16s ease-out',
    willChange: 'transform',
  }
  if (!item.result) return null

  return (
    <div
      ref={cv.box}
      data-lenis-prevent=""
      className={`checker relative mx-auto touch-none select-none overflow-hidden rounded-xl ${cv.zoomed ? (cv.dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-ew-resize'} ${className}`}
      style={{ aspectRatio: aspect, ...style }}
      {...cv.handlers}
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
              onLoad={(e) => onNatural?.({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
          </div>
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - cv.pos}% 0 0)` }}>
            <div className="absolute inset-0" style={layer}>
              <FadeImg src={urls.a} alt={t('compare.original')} draggable={false} className="absolute inset-0 h-full w-full object-fill" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" style={{ left: `${cv.pos}%` }}>
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
