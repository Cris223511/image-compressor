import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Code2, Menu, Moon, Sun, X } from 'lucide-react'
import { Collapse } from './Collapse'
import { Logo } from './Logo'
import { useT } from '../i18n'
import { useUi } from '../store/ui'
import { REPO_URL } from '../config/site'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors ${
    isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink'
  }`

export function Header() {
  const t = useT()
  const { theme, lang, setTheme, setLang } = useUi()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)
  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={close}>
        {t('nav.compress')}
      </NavLink>
      <NavLink to="/nosotros" className={linkClass} onClick={close}>
        {t('nav.about')}
      </NavLink>
      <NavLink to="/privacidad" className={linkClass} onClick={close}>
        {t('nav.privacy')}
      </NavLink>
      <NavLink to="/terminos" className={linkClass} onClick={close}>
        {t('nav.terms')}
      </NavLink>
    </>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="flex items-center gap-1.5">
          <div
            className="flex rounded-xl border border-line bg-sunken p-0.5 text-xs font-bold"
            role="group"
            aria-label={t('nav.language')}
          >
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-[10px] px-2.5 py-1.5 uppercase transition-colors ${
                  lang === l ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink"
            aria-label={t('nav.theme')}
            title={t('nav.theme')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink sm:grid"
            aria-label={t('nav.repo')}
            title={t('nav.repo')}
          >
            <Code2 size={18} />
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <Collapse open={open} className="md:hidden">
        <nav className="flex flex-col gap-1 border-t border-line bg-surface px-4 py-3">{links}</nav>
      </Collapse>
    </header>
  )
}
