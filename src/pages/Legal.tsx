import { useEffect, useRef, useState } from 'react'
import { ConsentPanel } from '../components/ConsentPanel'
import { scrollToTarget } from '../lib/lenis'
import { useDict } from '../i18n'

/** cada bloque de texto de una sección puede ser un párrafo, un subtítulo, una lista con viñetas o una numerada */
type Block = string | { sub: string } | { ul: string[] } | { ol: string[] }

/** los textos pueden marcar con **doble asterisco** lo que conviene resaltar en negrita */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === 'string') return <p key={i}><Rich text={b} /></p>
        if ('sub' in b) return <h3 key={i} className="pt-2 font-display text-lg font-bold text-ink">{b.sub}</h3>
        if ('ul' in b) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6 marker:text-brand">
              {b.ul.map((li) => (
                <li key={li}><Rich text={li} /></li>
              ))}
            </ul>
          )
        }
        return (
          <ol key={i} className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand">
            {b.ol.map((li) => (
              <li key={li}><Rich text={li} /></li>
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

  // mientras la página se desliza hacia una sección elegida, el resaltado no salta por las que va pasando
  const lockUntil = useRef(0)

  // la sección activa es la última cuyo inicio ya pasó por debajo de la cabecera
  useEffect(() => {
    const els = doc.sections.map((_, i) => document.getElementById(`sec-${i}`)).filter(Boolean) as HTMLElement[]
    const update = () => {
      if (performance.now() < lockUntil.current) return
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current = 0
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= 140) current = i
      })
      setActive(atEnd ? els.length - 1 : current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [doc])

  const goTo = (e: React.MouseEvent, i: number) => {
    e.preventDefault()
    const target = document.getElementById(`sec-${i}`)
    if (!target) return
    lockUntil.current = performance.now() + 1400
    setActive(i)
    // se pasa la posición exacta, dejando 96 px libres bajo la cabecera, igual que el margen de cada sección
    scrollToTarget(target.getBoundingClientRect().top + window.scrollY - 96)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted">{pages.updated}</p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[250px_1fr]">
        <nav className="hidden lg:block" aria-label={pages.toc}>
          <div data-lenis-prevent="" className="soft-scroll sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">{pages.toc}</p>
            <ul className="border-l border-line">
              {doc.sections.map((s, i) => (
                <li key={s.h}>
                  <a
                    href={`#sec-${i}`}
                    onClick={(e) => goTo(e, i)}
                    className={`-ml-px block border-l-2 py-1 pl-4 text-[0.83rem] leading-snug transition-all duration-300 ${
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
