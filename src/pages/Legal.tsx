import { useEffect, useState } from 'react'
import { useDict } from '../i18n'
import { Reveal } from '../components/about/Reveal'

/** páginas de términos y privacidad: texto largo con índice lateral que sigue la lectura */
export default function Legal({ which }: { which: 'privacy' | 'terms' }) {
  const { pages } = useDict()
  const doc = pages[which]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const els = doc.sections.map((_, i) => document.getElementById(`sec-${i}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
      },
      { rootMargin: '-90px 0px -65% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [doc])

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="rise font-display text-4xl font-extrabold sm:text-5xl" style={{ animationDelay: '250ms' }}>
          {doc.title}
        </h1>
        <p className="rise mt-3 text-sm text-muted" style={{ animationDelay: '390ms' }}>
          {pages.updated}
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav className="rise hidden lg:block" aria-label={pages.toc} style={{ animationDelay: '530ms' }}>
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">{pages.toc}</p>
            <ul className="space-y-0.5 border-l border-line">
              {doc.sections.map((s, i) => (
                <li key={s.h}>
                  <a
                    href={`#sec-${i}`}
                    className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-all duration-300 ${
                      active === i ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {s.h}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="max-w-2xl space-y-10">
          {doc.sections.map((s, i) => (
            <Reveal key={s.h} delay={i === 0 ? 670 : 0}>
              <section id={`sec-${i}`} data-i={i} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold">{s.h}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted">
                {s.p.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
