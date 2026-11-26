import Lenis from 'lenis'

// scroll suave con lenis, pero a medias, para que se note el deslizar sin que la página se sienta lenta
let lenis: Lenis | null = null
let raf = 0
let idleSince = 0

// el bucle solo corre mientras hay desplazamiento y se detiene un instante después, porque dejarlo siempre
// activo mantendría al navegador redibujando fotogramas sin necesidad
function loop(time: number) {
  if (!lenis) return
  lenis.raf(time)
  if (lenis.isScrolling) idleSince = time
  if (time - idleSince > 300) {
    raf = 0
    return
  }
  raf = requestAnimationFrame(loop)
}

function wake() {
  idleSince = performance.now()
  if (!raf) {
    // lenis mide el tiempo entre cuadros, así que tras estar parado el primer cuadro recibiría toda la pausa
    // de golpe y cualquier desplazamiento animado terminaría al instante, por eso se reinicia su reloj
    ;(lenis as unknown as { time: number }).time = 0
    raf = requestAnimationFrame(loop)
  }
}

export function startLenis() {
  if (lenis) return
  lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1, smoothWheel: true })
  for (const ev of ['wheel', 'touchstart', 'keydown', 'scroll'] as const) {
    window.addEventListener(ev, wake, { passive: true, capture: true })
  }
  wake()
}

/** arranca y frena con suavidad, a diferencia del easing por defecto de lenis que sale muy rápido */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** baja o sube hasta un elemento (o una altura) deslizando, y sin lenis usa el scroll nativo */
export function scrollToTarget(target: number | HTMLElement, offset = -88) {
  if (lenis) {
    lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : offset, duration: 1.3, easing: easeInOut })
    wake()
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** al cambiar de página se parte desde arriba al instante, sin deslizar por el contenido nuevo */
export function scrollTopNow() {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true })
    wake()
  } else window.scrollTo({ top: 0, behavior: 'instant' })
}
