import { useEffect, useState } from 'react'
import { ConsentPanel } from '../components/ConsentPanel'
import { useDict } from '../i18n'

/** cada bloque de texto de una sección puede ser un párrafo, un subtítulo, una lista con viñetas o una numerada */
type Block = string | { sub: string } | { ul: string[] } | { ol: string[] }

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === 'string') return <p key={i}>{b}</p>
        if ('sub' in b) return <h3 key={i} className="pt-2 font-display text-lg font-bold text-ink">{b.sub}</h3>
        if ('ul' in b) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6 marker:text-brand">
              {b.ul.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )
        }
        return (
          <ol key={i} className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand">
            {b.ol.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ol>
        )
      })}
    </>
  )
}

/** páginas de textos largos, con un índice lateral que acompaña la lectura */
export default function Legal({ which }: { which: 'privacy' | 'terms' | 'cookies' }) {
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
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted">{pages.updated}</p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label={pages.toc}>
          <div data-lenis-prevent="" className="soft-scroll sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
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
          {which === 'cookies' && <ConsentPanel />}
          {doc.sections.map((s, i) => (
            <div key={s.h}>
              <section id={`sec-${i}`} data-i={i} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold">{s.h}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted">
                <Blocks blocks={s.p as Block[]} />
              </div>
              </section>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
