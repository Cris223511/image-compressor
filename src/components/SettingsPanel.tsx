import { useEffect } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { useSettings } from '../store/settings'
import type { OutputFormat, QualityMode } from '../lib/compress/types'
import { useDict, useT } from '../i18n'

const MODES: QualityMode[] = ['recommended', 'high', 'max', 'custom']
const OUTPUTS: OutputFormat[] = ['keep', 'webp', 'avif', 'jpeg', 'png']
const SIZES = [0, 3840, 2560, 1920, 1280] as const

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const dict = useDict()
  const { settings, patch, reset } = useSettings()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className="fixed inset-0 z-40"
      aria-hidden={!open}
      // al cerrar se espera a que termine la animación antes de ocultarlo del todo
      style={{ visibility: open ? 'visible' : 'hidden', transition: open ? 'none' : 'visibility 0s linear 0.3s' }}
    >
      <div
        className={`absolute inset-0 bg-transparent backdrop-blur-md transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={t('settings.title')}
        className={`soft-scroll absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-lift transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{t('settings.title')}</h2>
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken" onClick={onClose} aria-label={t('settings.close')}>
            <X size={20} />
          </button>
        </div>

        <Section title={t('settings.modeTitle')}>
          <div className="grid gap-2">
            {MODES.map((m) => {
              const on = settings.mode === m
              return (
                <button
                  key={m}
                  onClick={() => patch({ mode: m })}
                  aria-pressed={on}
                  className={`rounded-2xl border p-3.5 text-left transition-colors ${
                    on ? 'border-brand bg-brand-soft' : 'border-line hover:bg-sunken'
                  }`}
                >
                  <p className={`text-[0.95rem] font-semibold ${on ? 'text-brand' : ''}`}>{dict.settings.mode[m].name}</p>
                  <p className="mt-0.5 text-sm text-muted">{dict.settings.mode[m].text}</p>
                </button>
              )
            })}
          </div>
          {settings.mode === 'custom' && (
            <div className="mt-4 rounded-2xl bg-sunken p-4">
              <div className="mb-2 flex justify-between text-sm font-semibold">
                <span>{t('settings.quality')}</span>
                <span className="text-brand">{settings.customQuality}</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={settings.customQuality}
                onChange={(e) => patch({ customQuality: Number(e.target.value) })}
                className="w-full accent-[rgb(var(--brand))]"
              />
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{t('settings.pngNote')}</p>
        </Section>

        <Section title={t('settings.outputTitle')}>
          <Chips options={OUTPUTS} value={settings.output} onChange={(o) => patch({ output: o })} label={(o) => dict.settings.output[o]} />
          <p className="mt-3 text-xs text-muted">{t('settings.outputHint')}</p>
        </Section>

        <Section title={t('settings.metaTitle')}>
          <label className="flex cursor-pointer items-start gap-3">
            <Switch on={settings.keepMetadata} onChange={(v) => patch({ keepMetadata: v })} label={t('settings.metaLabel')} />
            <span>
              <span className="block text-[0.95rem] font-semibold">{t('settings.metaLabel')}</span>
              <span className="mt-0.5 block text-sm text-muted">{t('settings.metaHint')}</span>
            </span>
          </label>
        </Section>

        <Section title={t('settings.resizeTitle')}>
          <Chips
            options={SIZES}
            value={settings.maxSide as (typeof SIZES)[number]}
            onChange={(px) => patch({ maxSide: px })}
            label={(px) => dict.settings.resize[String(px) as keyof typeof dict.settings.resize]}
          />
          <p className="mt-3 text-xs text-muted">{t('settings.resizeHint')}</p>
        </Section>

        <button className="btn-ghost mt-8 w-full" onClick={reset}>
          <RotateCcw size={15} /> {t('settings.reset')}
        </button>
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
      {children}
    </section>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: (v: T) => string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
            value === o ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:bg-sunken hover:text-ink'
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}
