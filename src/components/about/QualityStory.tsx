import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useDict } from '../../i18n'
import { Reveal } from './Reveal'

// medición real de la foto de ejemplo (3000 × 2000): calidad, peso en KB y similitud con el original
const DATA: readonly (readonly [number, number, number])[] = [
  [60, 570, 0.8868],
  [70, 705, 0.9092],
  [75, 807, 0.9235],
  [80, 961, 0.9402],
  [85, 1148, 0.9536],
  [88, 1302, 0.9603],
  [90, 1507, 0.9717],
  [92, 1695, 0.9816],
  [95, 2054, 0.9904],
  [98, 2645, 0.9945],
]
const Q_MIN = 60
const Q_MAX = 98
const KB_MIN = 500
const KB_MAX = 2700
const SCORE_MIN = 0.88
const TARGET = 0.91
const CHOSEN = 75

const W = 440
const H = 240
const x = (q: number) => 36 + ((q - Q_MIN) / (Q_MAX - Q_MIN)) * (W - 64)
const y = (kb: number) => H - 30 - ((kb - KB_MIN) / (KB_MAX - KB_MIN)) * (H - 64)

const LINE = DATA.map(([q, kb], i) => `${i ? 'L' : 'M'}${x(q).toFixed(1)} ${y(kb).toFixed(1)}`).join(' ')
const AREA = `${LINE} L${x(Q_MAX)} ${H - 30} L${x(Q_MIN)} ${H - 30} Z`

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)

function interp(q: number): { kb: number; score: number } {
  for (let i = 0; i < DATA.length - 1; i++) {
    const [q0, k0, s0] = DATA[i]
    const [q1, k1, s1] = DATA[i + 1]
    if (q >= q0 && q <= q1) {
      const f = (q - q0) / (q1 - q0)
      return { kb: k0 + (k1 - k0) * f, score: s0 + (s1 - s0) * f }
    }
  }
  const last = DATA[DATA.length - 1]
  return { kb: last[1], score: last[2] }
}

/** el recorrido del marcador: baja la calidad, se mide y se elige */
function markerQuality(p: number): number {
  if (p < 0.22) return Q_MAX
  if (p < 0.62) return Q_MAX - ((p - 0.22) / 0.4) * (Q_MAX - Q_MIN)
  if (p < 0.84) return Q_MIN + ease((p - 0.62) / 0.22) * (CHOSEN - Q_MIN)
  return CHOSEN
}

/** el instante en que empieza cada paso, para saltar a él al hacer clic */
const STARTS = [0, 0.22, 0.62, 0.84]
const stepOf = (p: number) => (p < 0.22 ? 0 : p < 0.62 ? 1 : p < 0.84 ? 2 : 3)

/** duración de una vuelta completa y pausa al final antes de repetir */
const LOOP_MS = 20000
const HOLD_MS = 2600

/**
 * recorrido por los cuatro pasos con que Squeezo decide la calidad. avanza solo mientras se ve
 * (y se detiene al pasar el cursor), y cada paso se puede tocar para saltar a él. los números
 * salen de una medición real.
 */
export function QualityStory() {
  const { pages } = useDict()
  const s = pages.about.story
  const [active, setActive] = useState(0)

  const root = useRef<HTMLElement>(null)
  const scan = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLDivElement>(null)
  const scanLayer = useRef<HTMLDivElement>(null)
  const chartLayer = useRef<HTMLDivElement>(null)
  const verify = useRef<HTMLDivElement>(null)
  const marker = useRef<SVGGElement>(null)
  const qOut = useRef<HTMLSpanElement>(null)
  const kbOut = useRef<HTMLSpanElement>(null)
  const scoreOut = useRef<HTMLSpanElement>(null)
  const gauge = useRef<HTMLDivElement>(null)
  const verdict = useRef<HTMLSpanElement>(null)

  const progress = useRef(0)
  const paused = useRef(false)
  const visible = useRef(false)
  const waited = useRef(0)

  // pinta el estado del escenario para un avance dado, escribiendo directo en el documento
  const apply = useCallback(
    (p: number) => {
      root.current?.style.setProperty('--p', p.toFixed(4))
      const f = clamp(p / 0.2)
      if (scan.current) scan.current.style.transform = `translateY(${(f - 1) * 100}%)`
      if (shade.current) shade.current.style.transform = `translateY(${f * 100}%)`

      const toChart = ease(clamp((p - 0.17) / 0.08))
      if (scanLayer.current) scanLayer.current.style.opacity = String(1 - toChart)
      if (chartLayer.current) chartLayer.current.style.opacity = String(toChart)
      if (verify.current) verify.current.style.opacity = String(ease(clamp((p - 0.87) / 0.07)))

      const q = markerQuality(p)
      const { kb, score } = interp(q)
      if (marker.current) marker.current.style.transform = `translate(${x(q)}px, ${y(kb)}px)`
      if (qOut.current) qOut.current.textContent = String(Math.round(q))
      if (kbOut.current) kbOut.current.textContent = `${Math.round(kb).toLocaleString()} KB`
      if (scoreOut.current) scoreOut.current.textContent = score.toFixed(3)
      const ok = score >= TARGET
      if (gauge.current) {
        gauge.current.style.width = `${clamp((score - SCORE_MIN) / (1 - SCORE_MIN)) * 100}%`
        gauge.current.style.backgroundColor = ok ? 'rgb(var(--good))' : 'rgb(var(--bad))'
      }
      if (verdict.current) {
        verdict.current.textContent = ok ? s.pass : s.fail
        verdict.current.style.color = ok ? 'rgb(var(--good))' : 'rgb(var(--bad))'
      }
      const next = stepOf(p)
      setActive((a) => (a === next ? a : next))
    },
    [s.pass, s.fail],
  )

  useEffect(() => {
    const el = root.current
    if (!el) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // cuenta como visto cuando ocupa buena parte de la pantalla; al llegar de nuevo desde fuera, vuelve a empezar
    const io = new IntersectionObserver(
      ([e]) => {
        const seen = e.intersectionRatio >= 0.55 || e.intersectionRect.height >= window.innerHeight * 0.6
        if (seen && !visible.current) {
          progress.current = 0
          waited.current = 0
          apply(0)
        }
        visible.current = seen
      },
      { threshold: [0, 0.25, 0.55, 0.8, 1] },
    )
    io.observe(el)

    apply(progress.current)

    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (visible.current && !paused.current && !document.hidden) {
        if (progress.current >= 1) {
          if (still) {
            raf = requestAnimationFrame(tick)
            return
          }
          // al terminar se queda un momento en el resultado y vuelve a empezar
          waited.current += dt
          if (waited.current > HOLD_MS) {
            progress.current = 0
            waited.current = 0
          }
        } else {
          progress.current = Math.min(1, progress.current + dt / LOOP_MS)
        }
        apply(progress.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [apply])

  const jump = (i: number) => {
    progress.current = Math.min(0.999, STARTS[i] + 0.01)
    waited.current = 0
    apply(progress.current)
  }

  const targetX = (clamp((TARGET - SCORE_MIN) / (1 - SCORE_MIN)) * 100).toFixed(2)

  return (
    <section
      id="calidad"
      ref={root}
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{s.title}</h2>
          </Reveal>
          <ol className="relative mt-8 space-y-3 pl-7">
            <span aria-hidden className="absolute bottom-3 left-[7px] top-3 w-0.5 rounded-full bg-line" />
            <span
              aria-hidden
              className="absolute left-[7px] top-3 w-0.5 origin-top rounded-full bg-brand"
              style={{ height: 'calc(100% - 1.5rem)', transform: 'scaleY(var(--p, 0))' }}
            />
            {s.steps.map((st, i) => (
              <li key={st.title} className="relative">
                <span
                  className={`absolute -left-7 top-5 h-3.5 w-3.5 rounded-full border-2 transition-all duration-500 ${
                    active >= i ? 'border-brand bg-brand' : 'border-line bg-surface'
                  } ${active === i ? 'scale-125' : ''}`}
                />
                <button
                  onClick={() => jump(i)}
                  aria-current={active === i}
                  className={`w-full rounded-2xl p-3 text-left transition-all duration-500 ease-out hover:bg-surface hover:opacity-100 ${
                    active === i ? 'bg-surface opacity-100 shadow-card' : 'opacity-45'
                  }`}
                >
                  <h3 className="font-display text-xl font-bold">{st.title}</h3>
                  <p className="mt-1 max-w-md text-[0.95rem] leading-relaxed text-muted">{st.text}</p>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* escenario: la imagen, la gráfica de calidad contra peso y la verificación final */}
        <Reveal delay={120}>
          <div className="relative aspect-[4/3.1] w-full overflow-hidden rounded-[28px] border border-line bg-surface shadow-lift">
            <div ref={scanLayer} className="absolute inset-0">
              <img src="/img/demo-original.jpg" alt="" className="h-full w-full object-cover" />
              <div ref={shade} className="absolute inset-0 bg-black/45" />
              <div ref={scan} className="absolute inset-0">
                <div className="absolute inset-x-0 bottom-0 h-20 border-b-2 border-brand bg-gradient-to-t from-brand/55 to-transparent" />
              </div>
              <span className="absolute left-4 top-4 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">{s.sample}</span>
            </div>

            <div ref={chartLayer} className="absolute inset-0 flex flex-col p-5 opacity-0 sm:p-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Readout label={s.quality}>
                  <span ref={qOut}>98</span>
                </Readout>
                <Readout label={s.weight}>
                  <span ref={kbOut}>2,645 KB</span>
                </Readout>
                <Readout label={s.similar}>
                  <span ref={scoreOut}>0.995</span>
                </Readout>
              </div>

              <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 min-h-0 w-full flex-1" role="img" aria-label={s.sample}>
                <defs>
                  <linearGradient id="story-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={AREA} fill="url(#story-area)" />
                <path d={LINE} fill="none" stroke="rgb(var(--brand))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <line x1={x(Q_MIN)} x2={x(Q_MAX)} y1={H - 30} y2={H - 30} stroke="rgb(var(--line))" />
                <text x={x(Q_MIN)} y={H - 10} fontSize="11" fill="rgb(var(--muted))">
                  {Q_MIN}
                </text>
                <text x={x(Q_MAX)} y={H - 10} fontSize="11" textAnchor="end" fill="rgb(var(--muted))">
                  {Q_MAX}
                </text>
                <g ref={marker} style={{ willChange: 'transform' }}>
                  <circle r="14" fill="rgb(var(--brand) / 0.18)" />
                  <circle r="7" fill="rgb(var(--brand))" stroke="white" strokeWidth="2.5" />
                </g>
              </svg>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted">
                    {s.threshold} {TARGET}
                  </span>
                  <span ref={verdict} />
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
                  <div ref={gauge} className="h-full rounded-full" style={{ width: '100%', transition: 'background-color 0.3s' }} />
                  <span className="absolute inset-y-0 w-0.5 bg-ink/70" style={{ left: `${targetX}%` }} />
                </div>
              </div>
            </div>

            <div ref={verify} className="absolute inset-0 grid place-items-center bg-surface/90 opacity-0">
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-good-soft text-good">
                  <CheckCircle2 size={34} />
                </span>
                <p className="mt-3 font-display text-2xl font-extrabold">{s.verified}</p>
                <p className="text-sm text-muted">3000 × 2000 px</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Readout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-sunken px-2 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums">{children}</p>
    </div>
  )
}
