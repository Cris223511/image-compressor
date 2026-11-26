import { useScrollVar } from '../../lib/useScroll'
import { FadeImg } from '../FadeImg'
import { useDict } from '../../i18n'

/** una banda con foto que se acerca y se desplaza distinto al scroll, con datos reales encima */
export function ParallaxBand() {
  const { pages } = useDict()
  const b = pages.about.band
  const ref = useScrollVar<HTMLElement>('pass')

  return (
    <section ref={ref} className="relative isolate overflow-hidden rounded-[32px] border border-line shadow-lift" style={{ minHeight: '34rem' }}>
      <FadeImg
        src="/img/pradera.jpg"
        alt=""
        loading="lazy"
        className="absolute inset-x-0 -top-[10%] -z-20 h-[120%] w-full object-cover"
        style={{ transform: 'translate3d(0, calc((var(--p, 0.5) - 0.5) * -110px), 0) scale(calc(1.22 - var(--p, 0.5) * 0.14))', willChange: 'transform' }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10" />

      <div
        className="relative flex min-h-[34rem] flex-col justify-end gap-8 p-6 text-white sm:p-10 lg:max-w-[62%]"
        style={{ transform: 'translate3d(0, calc((0.5 - var(--p, 0.5)) * 50px), 0)' }}
      >
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{b.title}</h2>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/85">{b.text}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {b.facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-white/12 p-3.5 ring-1 ring-white/15">
              <dd className="font-display text-2xl font-extrabold sm:text-3xl">{f.value}</dd>
              <dt className="mt-0.5 text-xs leading-snug text-white/75">{f.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
