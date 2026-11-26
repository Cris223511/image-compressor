import { Code2, FileArchive, Lock, ShieldCheck } from 'lucide-react'
import { useDict } from '../../i18n'
import { Reveal } from './Reveal'

const ICONS = [ShieldCheck, FileArchive, Code2, Lock]

/** cuatro garantías con su explicación, donde el texto manda y la animación solo acompaña */
export function Security() {
  const { pages } = useDict()
  return (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {pages.about.security.items.map((it, i) => {
        const Icon = ICONS[i]
        return (
          <Reveal key={it.title} delay={(i % 2) * 140}>
            <div className="group flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                <Icon size={22} />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold">{it.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{it.text}</p>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
