import { Cloud, Laptop, Lock, X } from 'lucide-react'
import { useDict } from '../../i18n'

/** un archivo que viaja dentro del equipo y nunca llega al servidor */
export function PrivacyDiagram() {
  const { pages } = useDict()
  const p = pages.about.privacy
  return (
    <div className="grid items-center gap-6 rounded-[28px] border border-line bg-surface p-6 shadow-card sm:grid-cols-[1fr_auto_1fr] sm:p-8">
      <div className="rounded-2xl border border-brand/30 bg-brand-soft/50 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
            <Laptop size={22} />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight">{p.you}</p>
            <p className="text-xs text-muted">Squeezo</p>
          </div>
        </div>
        <div className="relative mt-5 h-2 rounded-full bg-surface">
          <span className="travel absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-bad-soft text-bad">
          <X size={24} strokeWidth={2.6} />
        </span>
        <span className="font-display text-sm font-bold text-bad">{p.zero}</span>
      </div>

      <div className="rounded-2xl border border-dashed border-line bg-sunken/60 p-5 opacity-70">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-line text-muted">
            <Cloud size={22} />
          </span>
          <p className="font-display text-lg font-bold leading-tight text-muted">{p.server}</p>
        </div>
        <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Lock size={13} /> {p.nothing}
        </p>
      </div>
    </div>
  )
}
