import { useEffect, useRef } from 'react'

/**
 * progreso de un elemento mientras pasa por la pantalla, escrito en la variable css --p (de 0 a 1)
 * sin pasar por react. 'pass' va de que asoma por abajo a que sale por arriba; 'sticky' sirve para
 * secciones altas con un escenario fijo dentro, y avanza mientras ese escenario permanece.
 */
export function useScrollVar<T extends HTMLElement>(mode: 'pass' | 'sticky', onProgress?: (p: number) => void) {
  const ref = useRef<T>(null)
  const cb = useRef(onProgress)
  cb.current = onProgress

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const compute = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const raw = mode === 'pass' ? (vh - r.top) / (vh + r.height) : -r.top / Math.max(1, r.height - vh)
      const p = Math.min(1, Math.max(0, raw))
      el.style.setProperty('--p', p.toFixed(4))
      cb.current?.(p)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(raf)
    }
  }, [mode])

  return ref
}
