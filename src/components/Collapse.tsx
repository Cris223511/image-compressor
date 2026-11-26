import type { ReactNode } from 'react'

/** contenido que se abre y se cierra deslizando su altura, sin aparecer ni desaparecer de golpe */
export function Collapse({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      } ${className}`}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
