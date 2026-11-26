import { Eye, FileArchive, Folder, ImagePlus, Layers, Loader2, Lock } from 'lucide-react'
import { usePickers } from '../components/usePickers'
import { Workspace } from '../components/Workspace'
import { useT, useDict } from '../i18n'
import { useWorkspace } from '../store/workspace'

const POINT_ICONS = [Eye, Layers, Lock]

export default function Home() {
  const phase = useWorkspace((s) => s.phase)
  const hydrating = useWorkspace((s) => s.hydrating)
  const t = useT()
  const pickers = usePickers()

  const shown = phase === 'empty' ? 'hero' : 'work'

  // mientras se recupera la sesión guardada no se muestra nada a menos que tarde
  if (hydrating) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <span className="fade-in flex items-center gap-2" style={{ animationDelay: '600ms' }}>
          <Loader2 size={18} className="spin" /> {t('work.restoring')}
        </span>
      </div>
    )
  }
  return (
    <>
      {shown === 'hero' ? <Hero pickers={pickers} /> : <Workspace pickers={pickers} />}
      {pickers.inputs}
    </>
  )
}

function Hero({ pickers }: { pickers: ReturnType<typeof usePickers> }) {
  const t = useT()
  const dict = useDict()
  const scanning = useWorkspace((s) => s.scanning)

  return (
    <section className="relative overflow-hidden">
      {/* un resplandor muy suave detrás del título, nada que compita con el botón */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 0%, rgb(var(--brand) / 0.13) 0%, transparent 70%), radial-gradient(30% 40% at 85% 10%, rgb(26 174 255 / 0.10) 0%, transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
        <h1 className="font-display text-[2.9rem] font-extrabold leading-[1.02] sm:text-[4.6rem]">
          <span className="block">
            {t('hero.titleA')} <span className="squeeze text-brand">{t('hero.titleSqueeze')}</span>
          </span>
          <span className="block">
            {t('hero.titleB')}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
          {t('hero.subtitle')}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={pickers.openFiles}
            disabled={scanning}
            className="btn-primary h-[72px] min-w-[15.5rem] text-xl sm:h-20 sm:min-w-[21rem] sm:text-2xl"
          >
            {scanning ? <Loader2 size={24} className="spin" /> : <ImagePlus size={26} />}
            {scanning ? t('work.scanning') : t('hero.select')}
          </button>
          <div className="flex flex-col gap-2">
            <RoundButton label={t('hero.folder')} onClick={pickers.openFolder} disabled={scanning}>
              <Folder size={20} />
            </RoundButton>
            <RoundButton label={t('hero.zip')} onClick={pickers.openZip} disabled={scanning}>
              <FileArchive size={20} />
            </RoundButton>
          </div>
        </div>

        <p className="mt-5 text-sm text-muted">
          {t('hero.dropHint')}
        </p>
        <button
          onClick={pickers.loadSample}
          disabled={scanning}
          className="mt-3 text-sm font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand"
        >
          {t('hero.sample')}
        </button>

        <ul className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {dict.hero.points.map((p, i) => {
            const Icon = POINT_ICONS[i]
            return (
              <li key={p.title} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon size={20} />
                </span>
                <p className="mt-4 font-display text-[1.05rem] font-bold leading-snug">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function RoundButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand text-white shadow-md transition-transform hover:scale-110 sm:h-[38px] sm:w-[38px]"
    >
      {children}
    </button>
  )
}
