import type { ReactNode } from 'react'

/** contenido que se abre y se cierra deslizando su altura, sin aparecer ni desaparecer de golpe */
export function Collapse({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      } ${className}`}
      aria-hidden={!open}
      // inert saca del recorrido con el teclado lo que está cerrado
      {...(open ? {} : ({ inert: '' } as object))}
    >
      <div className="min-h-0 overflow-hidden">
        {/* el contenido se desliza y se aclara un poco después de que la altura empieza a moverse */}
        <div
          className={`transition-[opacity,transform] duration-500 ease-out ${
            open ? 'translate-y-0 opacity-100 delay-100' : '-translate-y-2 opacity-0'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
