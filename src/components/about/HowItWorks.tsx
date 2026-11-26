import { useEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction } from 'react'
import { FadeImg } from '../FadeImg'
import { ArrowRight, ChevronRight, Download, FileArchive, FileVideo, Folder, FolderOpen, ImagePlus, RotateCcw, ShieldAlert, Zap } from 'lucide-react'
import { Checkbox, type CheckState } from '../Checkbox'
import { Collapse } from '../Collapse'
import { formatBytes, formatSaved } from '../../lib/format'
import { useCountUp } from '../../lib/useCountUp'
import { useDict, useLocale, useT } from '../../i18n'

// archivos de la demo con pesos reales, que salen de comprimir estas mismas imágenes con el motor
interface Demo {
  id: string
  name: string
  kind: string
  thumb: string
  before: number
  after: number
}

const FILES: Demo[] = [
  { id: 'lago', name: 'lago.jpg', kind: 'JPG', thumb: '/img/t-lago.jpg', before: 1_080_686, after: 407_645 },
  { id: 'nubes', name: 'nubes.jpg', kind: 'JPG', thumb: '/img/t-nubes.jpg', before: 284_239, after: 69_630 },
  { id: 'bosque', name: 'bosque.jpg', kind: 'JPG', thumb: '/img/t-bosque.jpg', before: 1_049_581, after: 423_610 },
  { id: 'captura', name: 'captura.png', kind: 'PNG', thumb: '/img/t-captura.jpg', before: 48_602, after: 2_614 },
]
const ALL = FILES.map((f) => f.id)
const IN_PLAYA = ['lago', 'nubes']

type Selection = Set<string>

/** una luz que sigue al cursor dentro de la ventana, sin pasar por react */
function useCursorLight(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let x = 0
    let y = 0
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      x = e.clientX - r.left
      y = e.clientY - r.top
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0
          el.style.setProperty('--mx', `${x}px`)
          el.style.setProperty('--my', `${y}px`)
        })
      }
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      el.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [ref])
}

export function HowItWorks() {
  const { pages } = useDict()
  const how = pages.about.how
  const [step, setStep] = useState(0)
  const [shown, setShown] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number>()
  // al cambiar de paso lo anterior se desvanece antes de que entre lo nuevo, sin saltos
  const go = (n: number) => {
    if (n === step) return
    setStep(n)
    setLeaving(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setShown(n)
      setLeaving(false)
    }, 380)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const [selected, setSelected] = useState<Selection>(() => new Set(ALL))
  const stage = useRef<HTMLDivElement>(null)
  useCursorLight(stage)

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:content-start">
        {how.steps.map((s, i) => {
          const active = step === i
          return (
            <li key={s.title}>
              <button
                onClick={() => go(i)}
                aria-current={active}
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                  active ? 'border-brand/40 bg-surface shadow-card' : 'border-transparent hover:bg-surface/70'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold transition-colors ${
                      active ? 'bg-brand text-white' : 'bg-sunken text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-bold leading-tight">{s.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{s.text}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* ventana de la app, cuyo contenido responde al cursor y al toque */}
      <div ref={stage} className="relative overflow-hidden rounded-[26px] border border-line bg-surface shadow-lift">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(300px circle at var(--mx, 60%) var(--my, 20%), rgb(var(--brand) / 0.13), transparent 70%)' }}
        />
        <div className="relative flex items-center gap-2 border-b border-line bg-sunken/70 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-good/60" />
          <span className="ml-3 text-xs font-semibold text-muted">Squeezo</span>
        </div>
        <div className="relative min-h-[22rem] p-4 sm:p-6">
          <div
            key={shown}
            className={`transition-all duration-[380ms] ease-out ${leaving ? 'translate-y-3 opacity-0' : 'rise translate-y-0 opacity-100'}`}
          >
            {shown === 0 && <StepDrop onNext={() => go(1)} />}
            {shown === 1 && <StepReview selected={selected} setSelected={setSelected} onNext={() => go(2)} />}
            {shown === 2 && <StepCompress selected={selected} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
// primer paso, donde los archivos se arrastran hasta el recuadro

const TRAY = [
  { id: 'zip', name: 'vacaciones.zip', icon: FileArchive },
  { id: 'png', name: 'captura.png', icon: ImagePlus },
  { id: 'dir', name: 'playa', icon: Folder },
  { id: 'jpg', name: 'foto-01.jpg', icon: ImagePlus },
]

function StepDrop({ onNext }: { onNext: () => void }) {
  const t = useT()
  const zone = useRef<HTMLDivElement>(null)
  const [added, setAdded] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const done = added.length === TRAY.length
  const label = done ? t('pages.about.how.allAdded') : over ? t('pages.about.how.drop') : t('pages.about.how.drag')

  return (
    <div className="grid gap-4">
      <div
        ref={zone}
        className={`relative grid h-48 place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
          over ? 'scale-[1.015] border-brand bg-brand-soft' : 'border-brand/40 bg-brand-soft/40'
        }`}
      >
        <div className="text-center">
          <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white">
            <span className="pulse-ring absolute inset-0 rounded-2xl bg-brand" />
            <ImagePlus size={26} className="relative" />
          </span>
          <p key={label} className="fade-in mt-3 font-display text-lg font-bold">
            {label}
          </p>
          <p className="text-sm text-muted">{t('pages.about.how.added', { count: added.length, total: TRAY.length })}</p>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-1.5">
          {added.map((id) => (
            <span key={id} className="rise chip bg-surface text-ink shadow">
              {TRAY.find((c) => c.id === id)?.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-[3.25rem] flex-wrap items-center justify-center">
        {TRAY.filter((c) => !added.includes(c.id)).map((c, i) => (
          <DragChip
            key={c.id}
            chip={c}
            index={i}
            zone={zone}
            onOver={setOver}
            onDrop={(id) => setAdded((a) => [...a, id])}
          />
        ))}
        {done && (
          <div className="fade-in flex flex-wrap items-center justify-center gap-3">
            <button className="btn-primary h-11 px-5 text-sm" onClick={onNext}>
              {t('pages.about.how.next')} <ArrowRight size={16} />
            </button>
            <button className="btn-ghost h-11" onClick={() => setAdded([])}>
              <RotateCcw size={15} /> {t('pages.about.how.again')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** un archivo que se agarra con el cursor o el dedo y se suelta en el recuadro */
function DragChip({
  chip,
  index,
  zone,
  onOver,
  onDrop,
}: {
  chip: (typeof TRAY)[number]
  index: number
  zone: RefObject<HTMLDivElement>
  onOver: (over: boolean) => void
  onDrop: (id: string) => void
}) {
  const wrap = useRef<HTMLSpanElement>(null)
  const el = useRef<HTMLSpanElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const pos = useRef({ dx: 0, dy: 0 })
  const busy = useRef(false)

  const inside = (e: ReactPointerEvent) => {
    const r = zone.current?.getBoundingClientRect()
    return !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
  }

  // la pieza se encoge dentro del recuadro y luego su hueco se cierra, para que las demás se acomoden sin saltos
  const absorb = () => {
    const c = el.current
    const w = wrap.current
    if (!c || !w || busy.current) return
    busy.current = true
    c.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
    c.style.transform = `translate3d(${pos.current.dx}px,${pos.current.dy}px,0) scale(0.4)`
    c.style.opacity = '0'
    window.setTimeout(() => {
      w.style.overflow = 'hidden'
      w.style.maxWidth = '0px'
      w.style.paddingInline = '0px'
    }, 280)
    window.setTimeout(() => onDrop(chip.id), 620)
  }

  return (
    <span ref={wrap} className="inline-flex px-1.5" style={{ maxWidth: 220, transition: 'max-width 0.32s ease, padding 0.32s ease' }}>
      <span
        ref={el}
        role="button"
        tabIndex={0}
        aria-label={chip.name}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && absorb()}
        className="rise flex w-36 cursor-grab touch-none select-none items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-semibold shadow-card hover:shadow-lift active:cursor-grabbing"
        // la animación de entrada solo rellena hacia atrás, porque si mantuviera su transformación final pisaría la del arrastre
        style={{ animationDelay: `${index * 90}ms`, animationFillMode: 'backwards', willChange: 'transform' }}
        onPointerDown={(e) => {
          if (busy.current) return
          origin.current = { x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
          // mientras se arrastra no hay transición y la pieza va pegada al cursor
          e.currentTarget.style.transition = 'box-shadow 0.2s'
          e.currentTarget.style.zIndex = '30'
        }}
        onPointerMove={(e) => {
          const o = origin.current
          if (!o) return
          pos.current = { dx: e.clientX - o.x, dy: e.clientY - o.y }
          e.currentTarget.style.transform = `translate3d(${pos.current.dx}px,${pos.current.dy}px,0) rotate(3deg) scale(1.06)`
          onOver(inside(e))
        }}
        onPointerUp={(e) => {
          if (!origin.current) return
          origin.current = null
          onOver(false)
          if (inside(e)) absorb()
          else if (el.current) {
            // si no cae en el recuadro vuelve a su sitio con un pequeño rebote
            el.current.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.25), box-shadow 0.2s'
            el.current.style.transform = ''
            pos.current = { dx: 0, dy: 0 }
            window.setTimeout(() => el.current && (el.current.style.zIndex = ''), 450)
          }
        }}
      >
        <chip.icon size={15} className="shrink-0 text-brand" />
        <span className="truncate">{chip.name}</span>
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------------------
// segundo paso, donde el árbol se marca, se pliega y se revisa de verdad

function StepReview({
  selected,
  setSelected,
  onNext,
}: {
  selected: Selection
  setSelected: Dispatch<SetStateAction<Selection>>
  onNext: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [skipKind, setSkipKind] = useState<'videos' | 'blocked'>('videos')
  const [skipOpen, setSkipOpen] = useState(false)
  const toggleSkip = (k: 'videos' | 'blocked') => {
    if (skipOpen && skipKind === k) setSkipOpen(false)
    else {
      setSkipKind(k)
      setSkipOpen(true)
    }
  }

  const toggle = (ids: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const all = ids.every((i) => next.has(i))
      for (const i of ids) all ? next.delete(i) : next.add(i)
      return next
    })
  const stateOf = (ids: string[]): CheckState => (ids.every((i) => selected.has(i)) ? 'all' : ids.some((i) => selected.has(i)) ? 'some' : 'none')
  const flip = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))

  const picked = FILES.filter((f) => selected.has(f.id))
  const bytes = picked.reduce((n, f) => n + f.before, 0)

  const folder = (key: string, label: string, ids: string[], depth: number) => (
    <Row key={key} depth={depth} onClick={() => flip(key)}>
      <ChevronRight size={14} className={`shrink-0 text-muted transition-transform duration-200 ${collapsed[key] ? '' : 'rotate-90'}`} />
      <Checkbox state={stateOf(ids)} label={label} onChange={() => toggle(ids)} />
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        {collapsed[key] ? <Folder size={17} /> : <FolderOpen size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{t('work.folderCount', { count: ids.length })}</span>
      </span>
    </Row>
  )
  const file = (f: Demo, depth: number) => (
    <Row key={f.id} depth={depth} dim={!selected.has(f.id)} onClick={() => toggle([f.id])}>
      <span className="w-3.5 shrink-0" />
      <Checkbox state={selected.has(f.id) ? 'all' : 'none'} label={f.name} onChange={() => toggle([f.id])} />
      <FadeImg src={f.thumb} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{f.name}</span>
        <span className="block text-xs text-muted">
          {f.kind} · {formatBytes(f.before, locale)}
        </span>
      </span>
    </Row>
  )

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface/80">
        {folder('vacaciones', 'vacaciones', ALL, 0)}
        <Collapse open={!collapsed.vacaciones}>
          {folder('playa', 'playa', IN_PLAYA, 1)}
          <Collapse open={!collapsed.playa}>{FILES.filter((f) => IN_PLAYA.includes(f.id)).map((f) => file(f, 2))}</Collapse>
          {FILES.filter((f) => !IN_PLAYA.includes(f.id)).map((f) => file(f, 1))}
        </Collapse>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => toggleSkip('videos')}
          className="chip bg-sunken text-muted transition-colors hover:text-ink"
        >
          <FileVideo size={13} /> 3 · {t('pages.about.how.videos')}
        </button>
        <button
          onClick={() => toggleSkip('blocked')}
          className="chip bg-warn-soft text-warn transition-opacity hover:opacity-80"
        >
          <ShieldAlert size={13} /> 1 · {t('pages.about.how.blocked')}
        </button>
        <span className="ml-auto text-xs font-semibold text-muted">
          {t('pages.about.how.marked', { count: picked.length, total: FILES.length })} · {formatBytes(bytes, locale)}
        </span>
      </div>
      <Collapse open={skipOpen}>
        <p className="rounded-xl bg-sunken px-3 py-2 text-xs text-muted">{skipKind === 'videos' ? 'viaje.mp4, otro.mov, clip.mp4' : 'instalar.exe'}</p>
      </Collapse>

      <div className="flex justify-end">
        <button className="btn-primary h-11 px-5 text-sm" onClick={onNext}>
          {t('pages.about.how.next')} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function Row({ depth, dim, onClick, children }: { depth: number; dim?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2.5 border-b border-line/70 py-2 pr-3 transition-colors last:border-b-0 hover:bg-sunken/70 ${dim ? 'opacity-55' : ''}`}
      style={{ paddingLeft: 10 + depth * 20 }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------------------
// tercer paso, donde se comprime lo que quedó marcado

function StepCompress({ selected }: { selected: Selection }) {
  const t = useT()
  const locale = useLocale()
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const files = FILES.filter((f) => selected.has(f.id))
  const before = files.reduce((n, f) => n + f.before, 0)
  const after = files.reduce((n, f) => n + f.after, 0)
  const saved = before ? 1 - after / before : 0
  const pct = useCountUp(Math.round(saved * 100), 1100, phase === 'done')

  useEffect(() => {
    if (phase !== 'running') return
    const id = setTimeout(() => setPhase('done'), 1900)
    return () => clearTimeout(id)
  }, [phase])

  return (
    <div className="grid gap-4">
      {phase === 'idle' && (
        <button className="btn-primary h-14 text-base" disabled={!files.length} onClick={() => setPhase('running')}>
          <Zap size={19} /> {files.length ? t('work.compress', { count: files.length }) : t('work.nothingSelected')}
        </button>
      )}

      {phase === 'running' && (
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Zap size={15} className="text-brand" /> {t('work.compressing')}
            </span>
            <span className="text-muted">{files.length}</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
            <div className="bar-fill h-full rounded-full" style={{ animationDuration: '1800ms', backgroundImage: 'linear-gradient(90deg,#1456f0,#1aaeff)' }} />
            <div className="sheen absolute inset-0" />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="rise relative overflow-hidden rounded-2xl border border-line p-5">
          <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(60% 120% at 0% 0%, rgb(var(--good) / 0.13), transparent 70%)' }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-5xl font-extrabold leading-none text-good">-{Math.round(pct)}%</p>
              <p className="mt-2 text-sm text-muted">
                {formatBytes(before, locale)} → <b className="text-ink">{formatBytes(after, locale)}</b>
              </p>
            </div>
            <div className="flex gap-2">
              <span className="btn-primary h-11 px-4 text-sm">
                <Download size={16} /> {t('work.downloadAll')}
              </span>
              <button className="btn-ghost h-11" onClick={() => setPhase('idle')} aria-label={t('pages.about.how.again')} title={t('pages.about.how.again')}>
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line">
        {files.map((f, i) => (
          <div key={f.id} className="flex items-center gap-3 border-b border-line/70 px-3 py-2 last:border-b-0">
            <FadeImg src={f.thumb} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
            {phase === 'done' ? (
              <span className="rise flex items-center gap-2" style={{ animationDelay: `${i * 140}ms` }}>
                <span className="hidden text-xs text-muted sm:inline">
                  {formatBytes(f.before, locale)} → <b className="text-ink">{formatBytes(f.after, locale)}</b>
                </span>
                <span className="chip bg-good-soft text-good">-{formatSaved(1 - f.after / f.before, locale)}</span>
              </span>
            ) : phase === 'running' ? (
              <span className="h-2 w-16 animate-pulse rounded-full bg-sunken" />
            ) : (
              <span className="text-xs text-muted">{formatBytes(f.before, locale)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
