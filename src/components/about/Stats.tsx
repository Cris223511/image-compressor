import { useDict } from '../../i18n'
import { Odometer } from './Odometer'
import { useInView } from './Reveal'

/** cifras grandes cuyos dígitos giran al aparecer en pantalla */
export function Stats() {
  const { pages } = useDict()
  const [ref, seen] = useInView<HTMLDListElement>()
  const items = pages.about.stats

  return (
    <dl ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card lg:grid-cols-4">
      {items.map((s) => {
        const n = Number(s.value)
        const numeric = Number.isFinite(n)
        return (
          <div
            key={s.label}
            className="bg-surface px-5 py-7 text-center transition-colors duration-300 hover:bg-brand-soft/40"
          >
            <dd className="font-display text-4xl font-extrabold tracking-tight text-brand sm:text-5xl">
              {numeric ? <Odometer value={n} active={seen} /> : <span className={`inline-block transition-all duration-700 ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>{s.value}</span>}
            </dd>
            <dt className="mt-2 text-sm text-muted">{s.label}</dt>
          </div>
        )
      })}
    </dl>
  )
}
