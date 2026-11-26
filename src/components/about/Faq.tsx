import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapse } from '../Collapse'
import { useDict } from '../../i18n'

/** preguntas que se abren deslizando, y solo una a la vez para que la página no crezca sin control */
export function Faq() {
  const { pages } = useDict()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      {pages.about.faq.items.map((it, i) => {
        const on = open === i
        return (
          <div key={it.q}>
            <button
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-300 hover:bg-sunken/70 sm:px-6"
            >
              <span className={`font-display text-lg font-bold transition-colors duration-300 ${on ? 'text-brand' : ''}`}>{it.q}</span>
              <ChevronDown size={20} className={`shrink-0 text-muted transition-transform duration-300 ${on ? 'rotate-180 text-brand' : ''}`} />
            </button>
            <Collapse open={on} fade={false}>
              <p className="px-5 pb-5 leading-relaxed text-muted sm:px-6">{it.a}</p>
            </Collapse>
          </div>
        )
      })}
    </div>
  )
}
