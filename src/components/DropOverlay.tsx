import { ImagePlus } from 'lucide-react'
import { useT } from '../i18n'

/** está siempre montado para que aparezca y se vaya con un fundido, sin saltos */
export function DropOverlay({ show }: { show: boolean }) {
  const t = useT()
  return (
    <div
      aria-hidden={!show}
      className={`veil pointer-events-none fixed inset-0 z-50 grid place-items-center p-6 ${show ? 'on' : ''}`}
      style={{ visibility: show ? 'visible' : 'hidden', transitionProperty: 'background-color, backdrop-filter, -webkit-backdrop-filter, visibility', transitionDelay: show ? '0s' : '0s, 0s, 0s, 0.45s' }}
    >
      <div
        className={`flex w-full max-w-xl flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-brand bg-surface/95 px-8 py-14 text-center shadow-lift transition-all duration-300 ${
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
          <ImagePlus size={30} />
        </span>
        <p className="font-display text-2xl font-bold">{t('drop.title')}</p>
        <p className="text-muted">{t('drop.text')}</p>
      </div>
    </div>
  )
}
