import { useEffect, useLayoutEffect, useRef } from 'react'
import { FadeImg } from '../FadeImg'
import { MoveHorizontal } from 'lucide-react'
import { formatBytes, formatSaved } from '../../lib/format'
import { useDict, useLocale } from '../../i18n'

// pareja real: la misma foto antes y después de pasar por el motor de Squeezo en modo
// "sin pérdida visible". los pesos son los de los dos archivos de public/img.
const ORIGINAL = { src: '/img/demo-original.jpg', bytes: 815_863 }
const RESULT = { src: '/img/demo-squeezo.jpg', bytes: 277_259 }

/**
 * comparador que se mueve solo hasta que el visitante lo toma. para que arrastrar sea fluido
 * no pasa por react: cada cuadro solo cambia tres transformaciones, que el navegador resuelve
 * en la tarjeta gráfica sin volver a pintar ninguna de las dos imágenes.
 */
export function CompareDemo() {
  const { pages } = useDict()
  const locale = useLocale()
  const c = pages.about.compare

  const box = useRef<HTMLDivElement>(null)
  const clip = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLImageElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const width = useRef(0)
  const pct = useRef(50)
  const auto = useRef(true)
  const visible = useRef(true)
  const pending = useRef<number | null>(null)
  const frame = useRef(0)

  const paint = (p: number) => {
    pct.current = p
    const w = width.current
    const x = (p / 100) * w
    // la ventana que recorta se desplaza a la izquierda y la imagen se desplaza igual hacia la
    // derecha, así la foto queda quieta y solo cambia hasta dónde se ve
    if (clip.current) clip.current.style.transform = `translate3d(${x - w}px,0,0)`
    if (inner.current) inner.current.style.transform = `translate3d(${w - x}px,0,0)`
    if (line.current) line.current.style.transform = `translate3d(${x}px,0,0)`
  }

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      width.current = el.clientWidth
      paint(pct.current)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // el barrido automático solo corre mientras se ve y nadie lo ha tocado
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting))
    io.observe(el)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      if (auto.current && visible.current && !document.hidden) {
        const t = now - t0
        // con la preferencia de movimiento reducido solo se hace un barrido y se queda en el centro
        if (still && t > 5400) {
          paint(50)
          auto.current = false
        } else paint(50 + 36 * Math.sin(t / 1700))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const move = (clientX: number) => {
    pending.current = clientX
    if (frame.current) return
    // varios eventos de puntero caben en un cuadro: solo se pinta el último
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const r = box.current?.getBoundingClientRect()
      if (r && pending.current !== null) paint(Math.min(100, Math.max(0, ((pending.current - r.left) / r.width) * 100)))
    })
  }

  const saved = 1 - RESULT.bytes / ORIGINAL.bytes
  const layer = { willChange: 'transform' } as const

  return (
    <div className="relative">
      <div
        ref={box}
        className="relative aspect-[3/2] touch-none select-none overflow-hidden rounded-[28px] border border-line bg-sunken shadow-lift"
        onPointerDown={(e) => {
          auto.current = false
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e.clientX)
        }}
        onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
      >
        <FadeImg src={RESULT.src} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div ref={clip} className="absolute inset-0 overflow-hidden" style={layer}>
          <FadeImg
            ref={inner}
            src={ORIGINAL.src}
            alt=""
            draggable={false}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={layer}
          />
        </div>
        <div ref={line} className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.2)]" style={layer}>
          <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand shadow-xl">
            <MoveHorizontal size={19} />
          </span>
        </div>
        <Tag side="left" label={c.original} value={formatBytes(ORIGINAL.bytes, locale)} />
        <Tag side="right" label={c.result} value={formatBytes(RESULT.bytes, locale)} accent />
      </div>

      {/* sello con el ahorro real de esta pareja de imágenes */}
      <div className="float absolute -bottom-5 right-6 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-lift">
        <p className="font-display text-2xl font-extrabold leading-none text-good">-{formatSaved(saved, locale)}</p>
        <p className="mt-1 text-xs text-muted">{c.same}</p>
      </div>
    </div>
  )
}

// las etiquetas llevan fondo sólido: un desenfoque de fondo se recalcularía en cada movimiento
function Tag({ side, label, value, accent }: { side: 'left' | 'right'; label: string; value: string; accent?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute top-4 rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${
        accent ? 'bg-brand' : 'bg-black/70'
      } ${side === 'left' ? 'left-4' : 'right-4'}`}
    >
      {label} · {value}
    </span>
  )
}
