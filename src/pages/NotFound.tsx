import { Link } from 'react-router-dom'
import { useT } from '../i18n'

export default function NotFound() {
  const t = useT()
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="rise font-display text-8xl font-extrabold text-brand/20" style={{ fontStretch: '75%', animationDelay: '250ms' }}>
        404
      </p>
      <h1 className="rise mt-2 font-display text-3xl font-bold" style={{ animationDelay: '390ms' }}>{t('notFound.title')}</h1>
      <Link to="/" className="rise btn-primary mt-8 h-12 px-6" style={{ animationDelay: '530ms' }}>
        {t('notFound.back')}
      </Link>
    </div>
  )
}
