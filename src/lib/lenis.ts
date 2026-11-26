import Lenis from 'lenis'

// scroll suave con lenis, pero a medias: se nota el deslizar sin que la página se sienta lenta
let lenis: Lenis | null = null

export function startLenis() {
  if (lenis) return
  lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1, smoothWheel: true })
  const raf = (time: number) => {
    lenis?.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)
}

/** baja o sube hasta un elemento (o una altura) deslizando; sin lenis usa el scroll nativo */
export function scrollToTarget(target: number | HTMLElement, offset = -88) {
  if (lenis) {
    lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : offset, duration: 1.1 })
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** al cambiar de página se parte desde arriba al instante, sin deslizar por el contenido nuevo */
export function scrollTopNow() {
  if (lenis) lenis.scrollTo(0, { immediate: true })
  else window.scrollTo({ top: 0, behavior: 'instant' })
}
