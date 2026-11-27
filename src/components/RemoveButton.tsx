import { Trash2 } from 'lucide-react'

/** botón de eliminar que quita el elemento de inmediato, sin pedir confirmación */
export function RemoveButton({ label, onRemove, disabled }: { label: string; onRemove: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-bad-soft hover:text-bad disabled:pointer-events-none disabled:opacity-40"
      data-tip={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
    >
      <Trash2 size={16} />
    </button>
  )
}
