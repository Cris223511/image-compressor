import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Tip {
  text: string
  rect: DOMRect
}

/** globo de ayuda propio, que reemplaza al del sistema en cualquier elemento con el atributo data-tip */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null)
  const [on, setOn] = useState(false)
  const [at, setAt] = useState({ left: 0, top: 0, arrow: 0, below: false })
  const box = useRef<HTMLDivElement>(null)
  const current = useRef<Element | null>(null)
  const timer = useRef(0)
  const onRef = useRef(false)
  onRef.current = on

  useEffect(() => {
    const clear = () => window.clearTimeout(timer.current)
    const hide = () => {
      clear()
      current.current = null
      setOn(false)
    }
    const show = (el: Element) => {
      const text = el.getAttribute('data-tip')
      if (!text) return hide()
      current.current = el
      setTip({ text, rect: el.getBoundingClientRect() })
      // al estrenarse parte invisible y en el cuadro siguiente aparece, para que la entrada se anime
      requestAnimationFrame(() => setOn(true))
    }
    const target = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-tip]') : null)

    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const el = target(e)
      if (el === current.current) return
      clear()
      if (!el) return hide()
      // con un globo ya visible el siguiente aparece al instante, y si no se espera un momento para no molestar
      timer.current = window.setTimeout(() => show(el), onRef.current ? 0 : 350)
    }
    const focus = (e: FocusEvent) => {
      const el = target(e)
      if (el && el.matches(':focus-visible')) show(el)
    }

    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('wheel', hide, { capture: true, passive: true })
    document.addEventListener('scroll', hide, true)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('keydown', hide, true)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      clear()
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('wheel', hide, true)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('keydown', hide, true)
      document.documentElement.removeEventListener('mouseleave', hide)
    }
  }, [])

  // si el elemento desaparece mientras el globo está a la vista, por ejemplo al eliminar una fila, el globo se va con él
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => {
      if (!current.current?.isConnected) setOn(false)
    }, 250)
    return () => window.clearInterval(id)
  }, [on])

  // se coloca centrado sobre el elemento, o debajo si arriba no cabe, sin salirse de la pantalla
  useLayoutEffect(() => {
    const b = box.current
    if (!tip || !b) return
    const w = b.offsetWidth
    const h = b.offsetHeight
    const r = tip.rect
    const margin = 8
    const left = Math.min(window.innerWidth - w - margin, Math.max(margin, r.left + r.width / 2 - w / 2))
    const below = r.top - h - 10 < margin
    const top = below ? r.bottom + 10 : r.top - h - 10
    const arrow = Math.min(w - 14, Math.max(14, r.left + r.width / 2 - left))
    setAt({ left, top, arrow, below })
  }, [tip])

  if (!tip) return null
  return (
    <div
      ref={box}
      role="tooltip"
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[300] w-max max-w-[18rem] break-words rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-bg shadow-lg"
      style={{
        transform: `translate(${at.left}px, ${at.top + (on ? 0 : at.below ? -4 : 4)}px)`,
        opacity: on ? 1 : 0,
        transition: on ? 'opacity 250ms ease, transform 250ms cubic-bezier(0.22, 1, 0.36, 1)' : 'opacity 200ms ease',
      }}
    >
      {tip.text}
      <span aria-hidden className={`absolute h-2 w-2 rotate-45 bg-ink ${at.below ? '-top-1' : '-bottom-1'}`} style={{ left: at.arrow - 4 }} />
    </div>
  )
}
