import { useEffect, useRef, useState, type ReactNode } from 'react'

/** muestra su contenido con una entrada suave la primera vez que aparece en pantalla */
export function useInView<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let io: IntersectionObserver | undefined
    const begin = () => {
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            setSeen(true)
            io?.disconnect()
          }
        },
        { threshold: 0.18 },
      )
      io.observe(el)
    }
    // si la página aún no es visible se espera un momento, para que la entrada no pase sin verse
    const wait = document.documentElement.classList.contains('ready') ? 0 : 800
    const id = window.setTimeout(begin, wait)
    return () => {
      window.clearTimeout(id)
      io?.disconnect()
    }
  }, [])
  return [ref, seen]
}

/** true mientras el elemento está en pantalla, y vuelve a false cuando sale */
export function useVisible<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, visible]
}

/** sus animaciones infinitas solo corren mientras se ve, para no gastar procesador ni tarjeta gráfica */
export function Live({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [ref, visible] = useVisible<HTMLDivElement>()
  return (
    <div ref={ref} className={`live ${className}`} style={{ '--play': visible ? 'running' : 'paused' } as React.CSSProperties}>
      {children}
    </div>
  )
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${seen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
