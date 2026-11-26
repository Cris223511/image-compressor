import { Check, Minus } from 'lucide-react'

export type CheckState = 'all' | 'some' | 'none'

export function Checkbox({
  state,
  onChange,
  label,
  disabled,
}: {
  state: CheckState
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  const on = state !== 'none'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'some' ? 'mixed' : state === 'all'}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={`grid h-[20px] w-[20px] shrink-0 place-items-center rounded-[6px] border transition-all duration-150 ${
        on ? 'border-brand bg-brand text-white' : 'border-muted/50 bg-surface hover:border-brand'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Check
        size={14}
        strokeWidth={3.2}
        className={`col-start-1 row-start-1 transition-all duration-200 ${state === 'all' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
      />
      <Minus
        size={14}
        strokeWidth={3.2}
        className={`col-start-1 row-start-1 transition-all duration-200 ${state === 'some' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
      />
    </button>
  )
}
