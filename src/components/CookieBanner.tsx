import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Cookie, X } from 'lucide-react'
import { useConsent } from '../store/consent'
import { useDict } from '../i18n'

/** aviso inferior que sube desde abajo hasta que la persona decide qué se puede guardar */
export function CookieBanner() {
  const { cookies } = useDict()
  const decided = useConsent((s) => s.decided)
  const acceptAll = useConsent((s) => s.acceptAll)
  const rejectAll = useConsent((s) => s.rejectAll)
  const { pathname } = useLocation()

  // aparece un momento después de cargar la página para que no compita con ella
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 900)
    return () => window.clearTimeout(id)
  }, [])
  const show = ready && !decided && pathname !== '/cookies'

  return (
    <div
      role="dialog"
      aria-label={cookies.bannerTitle}
      aria-hidden={!show}
      {...(show ? {} : ({ inert: '' } as object))}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:pb-6 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'
      }`}
      style={{ visibility: show ? 'visible' : 'hidden', transitionProperty: 'transform, opacity, visibility', transitionDelay: show ? '0s' : '0s, 0s, 0.7s' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border border-line bg-surface px-5 py-4 shadow-lift sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-5">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand sm:grid">
          <Cookie size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{cookies.bannerTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{cookies.bannerText}</p>
          <Link to="/cookies" className="mt-1.5 inline-block text-sm font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand">
            {cookies.customize}
          </Link>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button className="btn-primary h-11 flex-1 px-5 sm:flex-none" onClick={acceptAll}>
            <Check size={16} /> {cookies.accept}
          </button>
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line px-5 font-semibold transition-colors hover:bg-sunken sm:flex-none"
            onClick={rejectAll}
          >
            <X size={16} /> {cookies.reject}
          </button>
        </div>
      </div>
    </div>
  )
}
