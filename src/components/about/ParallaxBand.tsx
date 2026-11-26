import { FadeImg } from '../FadeImg'
import { Reveal } from './Reveal'
import { useDict } from '../../i18n'

/** una banda con foto y datos reales encima, donde la foto se acerca despacio al pasar el cursor */
export function ParallaxBand() {
  const { pages } = useDict()
  const b = pages.about.band

  return (
    <section className="group relative isolate overflow-hidden rounded-[32px] border border-line shadow-lift" style={{ minHeight: '34rem' }}>
      <div className="absolute inset-0 -z-20 transition-transform duration-[1800ms] ease-out group-hover:scale-105">
        <FadeImg src="/img/pradera.jpg" alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10" />

      <Reveal className="relative flex min-h-[34rem] flex-col justify-end gap-8 p-6 text-white sm:p-10 lg:max-w-[62%]" delay={200}>
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{b.title}</h2>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/85">{b.text}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {b.facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-white/12 p-3.5 ring-1 ring-white/15 transition-colors duration-300 hover:bg-white/20">
              <dd className="font-display text-2xl font-extrabold sm:text-3xl">{f.value}</dd>
              <dt className="mt-0.5 text-xs leading-snug text-white/75">{f.label}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  )
}
