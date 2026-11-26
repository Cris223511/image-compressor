import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUp, ExternalLink } from 'lucide-react'
import { Logo } from './Logo'
import { REPO_URL } from '../config/site'
import { scrollToTarget } from '../lib/lenis'
import { useDict } from '../i18n'

// destinos de cada enlace, en el mismo orden que las columnas del diccionario
const DEST: string[][] = [
  ['/', '/nosotros#como-funciona', '/nosotros#formatos', '/nosotros#seguridad', '/nosotros#faq'],
  ['/privacidad', '/terminos', '/cookies', `${REPO_URL}/blob/main/LICENSE`],
  [REPO_URL, `${REPO_URL}/issues`, `${REPO_URL}/blob/main/CHANGELOG.md`, `${REPO_URL}/releases`],
  ['https://react.dev', 'https://vite.dev', 'https://github.com/jamsinclair/jSquash', 'https://svgo.dev', 'https://www.lcdf.org/gifsicle/'],
]

const linkClass = 'group inline-flex whitespace-nowrap items-center gap-1.5 text-[0.92rem] text-muted transition-all duration-300 hover:translate-x-1 hover:text-brand'

export function Footer() {
  const { footer } = useDict()

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-surface">
      <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_2.3fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs leading-relaxed text-muted">{footer.blurb}</p>
            <Link to="/" className="btn-primary mt-6 h-12 px-6">
              {footer.cta} <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {footer.cols.map((col, ci) => (
              <div key={col.title}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-ink">{col.title}</h3>
                <ul className="space-y-3">
                  {col.links.map((label, li) => {
                    const to = DEST[ci][li]
                    return (
                      <li key={label}>
                        {to.startsWith('/') ? (
                          <Link to={to} className={linkClass}>
                            {label}
                          </Link>
                        ) : (
                          <a href={to} target="_blank" rel="noopener noreferrer" className={linkClass}>
                            {label}
                            <ExternalLink size={12} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line py-6 text-sm text-muted sm:flex-row">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start">
            <span>{footer.rights}</span>
            <a
              href={`${REPO_URL}/releases/tag/v${__APP_VERSION__}`}
              target="_blank"
              rel="noopener noreferrer"
              title={footer.version}
              className="chip bg-brand-soft text-brand transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card"
            >
              v{__APP_VERSION__}
            </a>
          </p>
          <button
            onClick={() => scrollToTarget(0)}
            className="group inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-medium transition-all duration-300 hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
          >
            {footer.top} <ArrowUp size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

    </footer>
  )
}
