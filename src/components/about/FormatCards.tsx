import { Ban, FileArchive, FileVideo, ShieldAlert } from 'lucide-react'
import { useDict } from '../../i18n'
import { Live, Reveal } from './Reveal'

/** una tarjeta por tipo de archivo, con una animación pequeña de lo que le pasa */
export function FormatCards() {
  const { pages } = useDict()
  const items = pages.about.formats.items
  const visuals = [<LossyVisual />, <PngVisual />, <GifVisual />, <SvgVisual />, <ZipVisual />, <SkipVisual />]

  return (
    <Live className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <Reveal key={it.name} delay={(i % 3) * 140}>
          <article className="group h-full overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-transform duration-300 hover:-translate-y-1">
            <div className="grid h-36 place-items-center border-b border-line bg-sunken/60 px-5">{visuals[i]}</div>
            <div className="p-5">
              <h3 className="font-display text-xl font-bold">{it.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{it.text}</p>
            </div>
          </article>
        </Reveal>
      ))}
    </Live>
  )
}

/** una barra de calidad que baja hasta el punto en que ya no se nota */
function LossyVisual() {
  return (
    <div className="w-full max-w-[15rem]">
      <div className="relative h-3 rounded-full bg-gradient-to-r from-brand/20 via-brand/50 to-brand">
        <span className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-surface bg-brand shadow-lg" style={{ animation: 'slide-q 4.5s ease-in-out infinite alternate' }} />
      </div>
      <div className="mt-3 flex justify-between text-[11px] font-semibold text-muted">
        <span>-</span>
        <span className="text-good">ok</span>
        <span>+</span>
      </div>
    </div>
  )
}

/** una rejilla de píxeles que no cambia de color mientras el peso baja */
function PngVisual() {
  return (
    <div className="grid grid-cols-8 gap-1">
      {Array.from({ length: 32 }, (_, i) => (
        <span
          key={i}
          className="h-4 w-4 rounded-[4px]"
          style={{
            background: `rgb(var(--brand) / ${0.25 + ((i * 7) % 10) / 14})`,
            animation: 'pulse-px 3s ease-in-out infinite',
            animationDelay: `${(i % 8) * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}

/** una pelota que rebota: la animación del gif se conserva */
function GifVisual() {
  return (
    <div className="relative h-20 w-44 overflow-hidden rounded-xl border border-line bg-surface">
      {/* un elemento mueve la pelota en horizontal y otro en vertical, para que no se pisen */}
      <span className="absolute left-2 top-2 block" style={{ animation: 'bounce-x 2.6s ease-in-out infinite' }}>
        <span className="block h-5 w-5 rounded-full bg-brand" style={{ animation: 'bounce-y 1.3s ease-in-out infinite' }} />
      </span>
      <span className="absolute bottom-1.5 right-2 text-[10px] font-bold tracking-wider text-muted">GIF</span>
    </div>
  )
}

/** una línea de código con un script que se tacha */
function SvgVisual() {
  return (
    <div className="w-full max-w-[15rem] rounded-xl border border-line bg-surface p-3 font-mono text-[11px] leading-5 text-muted">
      <p>&lt;svg viewBox="0 0 24 24"&gt;</p>
      <p className="strike relative w-fit text-bad">&nbsp;&nbsp;&lt;script&gt;alert(1)&lt;/script&gt;</p>
      <p>&nbsp;&nbsp;&lt;path d="M4 12h16"/&gt;</p>
      <p>&lt;/svg&gt;</p>
    </div>
  )
}

/** archivos que caen dentro de una carpeta zip */
function ZipVisual() {
  return (
    <div className="relative grid h-24 w-40 place-items-end">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute h-5 w-14 rounded-md border border-line bg-surface shadow"
          style={{ left: `${10 + i * 28}%`, animation: 'drop-in 2.6s ease-in infinite', animationDelay: `${i * 380}ms` }}
        />
      ))}
      <span className="relative z-10 grid h-14 w-24 place-items-center rounded-2xl bg-brand text-white shadow-lift">
        <FileArchive size={26} />
      </span>
    </div>
  )
}

/** lo que no es imagen se descarta y se avisa */
function SkipVisual() {
  const chips = [
    { icon: FileVideo, label: 'mp4', tone: 'bg-sunken text-muted' },
    { icon: ShieldAlert, label: 'exe', tone: 'bg-warn-soft text-warn' },
    { icon: Ban, label: 'pdf', tone: 'bg-sunken text-muted' },
  ]
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((c, i) => (
        <span key={c.label} className={`chip ${c.tone} float`} style={{ animationDelay: `${i * 400}ms` }}>
          <c.icon size={13} /> .{c.label}
        </span>
      ))}
    </div>
  )
}
