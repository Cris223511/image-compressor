import { useState } from 'react'
import { Check, Cookie } from 'lucide-react'
import { Switch } from './Switch'
import { useConsent, type Consent } from '../store/consent'
import { useDict } from '../i18n'

/** preferencias de cookies, donde cada permiso se aplica en cuanto se cambia */
export function ConsentPanel() {
  const { cookies } = useDict()
  const state = useConsent()
  const [saved, setSaved] = useState(false)

  const change = (patch: Partial<Consent>) => {
    state.save({ settings: state.settings, session: state.session, counter: state.counter, ...patch })
    setSaved(true)
  }

  const rows: { key: keyof Consent; title: string; text: string }[] = [
    { key: 'settings', title: cookies.settings.title, text: cookies.settings.text },
    { key: 'counter', title: cookies.counter.title, text: cookies.counter.text },
  ]

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Cookie size={22} />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">{cookies.panelTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{state.decided ? cookies.decided : cookies.undecided}</p>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
        <li className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-semibold">{cookies.necessary.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">{cookies.necessary.text}</p>
          </div>
          <Switch checked disabled label={cookies.necessary.title} onChange={() => undefined} />
        </li>
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{r.text}</p>
            </div>
            <Switch checked={state[r.key]} label={r.title} onChange={(v) => change({ [r.key]: v })} />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="btn-primary h-11 px-5" onClick={() => (state.acceptAll(), setSaved(true))}>
          {cookies.acceptAll}
        </button>
        <button
          className="inline-flex h-11 items-center rounded-2xl border border-line px-5 font-semibold transition-colors hover:bg-sunken"
          onClick={() => (state.rejectAll(), setSaved(true))}
        >
          {cookies.rejectAll}
        </button>
        <span className={`inline-flex items-center gap-1.5 text-sm text-good transition-opacity duration-300 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={15} /> {cookies.savedNote}
        </span>
      </div>
    </div>
  )
}
