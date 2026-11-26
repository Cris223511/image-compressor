import { Link } from 'react-router-dom'
import { ArrowRight, Code2 } from 'lucide-react'
import { CompareDemo } from '../components/about/CompareDemo'
import { HowItWorks } from '../components/about/HowItWorks'
import { FormatCards } from '../components/about/FormatCards'
import { QualityStory } from '../components/about/QualityStory'
import { ParallaxBand } from '../components/about/ParallaxBand'
import { Security } from '../components/about/Security'
import { Faq } from '../components/about/Faq'
import { Stats } from '../components/about/Stats'
import { Reveal } from '../components/about/Reveal'
import { REPO_URL } from '../config/site'
import { useDict, useT } from '../i18n'

const h2 = 'font-display text-3xl font-extrabold sm:text-4xl'

export default function About() {
  const t = useT()
  const { pages } = useDict()
  const a = pages.about

  return (
    <article className="overflow-x-clip">
      {/* portada con la misma foto antes y después y el ahorro real a la vista */}
      <header className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
          style={{
            background:
              'radial-gradient(55% 70% at 15% 0%, rgb(var(--brand) / 0.14), transparent 70%), radial-gradient(40% 55% at 95% 25%, rgb(26 174 255 / 0.12), transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="rise font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">{a.title}</h1>
            <p className="rise mt-5 max-w-md text-lg leading-relaxed text-muted" style={{ animationDelay: '140ms' }}>
              {a.lead}
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '280ms' }}>
              <Link to="/" className="btn-primary h-12 px-6">
                {a.cta} <ArrowRight size={18} />
              </Link>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost h-12 px-5">
                <Code2 size={17} /> GitHub
              </a>
            </div>
          </div>
          <div className="rise" style={{ animationDelay: '420ms' }}>
            <CompareDemo />
            <p className="mt-9 text-center text-xs text-muted">{a.compare.drag}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <Reveal>
          <Stats />
        </Reveal>
      </div>

      <QualityStory />

      <div className="mx-auto max-w-6xl space-y-32 px-4 pb-8 pt-16 sm:px-6">
        <section id="como-funciona" className="scroll-mt-24">
          <Reveal>
            <h2 className={h2}>{a.how.title}</h2>
            <p className="mt-3 max-w-xl text-muted">{a.how.hint}</p>
          </Reveal>
          <Reveal className="mt-10" delay={160}>
            <HowItWorks />
          </Reveal>
        </section>

        <Reveal>
          <ParallaxBand />
        </Reveal>

        <section id="formatos" className="scroll-mt-24">
          <Reveal>
            <h2 className={h2}>{a.formats.title}</h2>
          </Reveal>
          <div className="mt-8">
            <FormatCards />
          </div>
        </section>

        <section id="seguridad" className="scroll-mt-24">
          <Reveal>
            <h2 className={h2}>{a.security.title}</h2>
          </Reveal>
          <div className="mt-10">
            <Security />
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24">
          <Reveal>
            <h2 className={h2}>{a.faq.title}</h2>
          </Reveal>
          <Reveal className="mt-10" delay={160}>
            <Faq />
          </Reveal>
        </section>

        <Reveal className="text-center">
          <Link to="/" className="btn-primary h-14 px-8 text-lg">
            {t('hero.select')} <ArrowRight size={20} />
          </Link>
        </Reveal>
      </div>
    </article>
  )
}
