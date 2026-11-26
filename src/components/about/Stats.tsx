import { useMemo } from 'react'
import { readTotal } from '../../lib/stats'
import { useDict } from '../../i18n'
import { Odometer } from './Odometer'
import { useInView } from './Reveal'

/** cifras grandes cuyos dígitos giran al aparecer en pantalla; la última cuenta lo que se comprimió aquí */
export function Stats() {
  const { pages } = useDict()
  const [ref, seen] = useInView<HTMLDListElement>()
  const local = useMemo(() => readTotal(), [])
  const items = [...pages.about.stats, { value: String(local), label: pages.about.liveStat }]

  return (
    <dl ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card lg:grid-cols-5">
      {items.map((s, i) => {
        const n = Number(s.value)
        const numeric = Number.isFinite(n)
        return (
          <div
            key={s.label}
            className={`bg-surface px-5 py-7 text-center transition-colors duration-300 hover:bg-brand-soft/40 ${i === items.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}
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
