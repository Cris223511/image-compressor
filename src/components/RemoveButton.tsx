import { useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { useT } from '../i18n'

/** botón de eliminar que pide confirmar en la misma fila, así un clic pregunta y el siguiente elimina */
export function RemoveButton({ label, onConfirm, disabled }: { label: string; onConfirm: () => void; disabled?: boolean }) {
  const t = useT()
  const [asking, setAsking] = useState(false)

  // si no se confirma, la pregunta se retira sola o con Escape
  useEffect(() => {
    if (!asking) return
    const timer = window.setTimeout(() => setAsking(false), 4000)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setAsking(false)
    window.addEventListener('keydown', key)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', key)
    }
  }, [asking])

  if (asking) {
    return (
      <div className="fade-in flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          autoFocus
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bad px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          <Check size={14} /> {t('work.confirm')}
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
          title={t('work.cancel')}
          aria-label={t('work.cancel')}
          onClick={() => setAsking(false)}
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <button
      disabled={disabled}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-bad-soft hover:text-bad disabled:pointer-events-none disabled:opacity-40"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        setAsking(true)
      }}
    >
      <Trash2 size={16} />
    </button>
  )
}
