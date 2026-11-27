import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Tip {
  id: number
  text: string
  rect: DOMRect
  /** mientras el cursor sigue sobre el elemento, y al salir el globo se desvanece por su cuenta */
  live: boolean
}

/** cuánto tarda en desmontarse un globo después de empezar a desvanecerse */
const LEAVE_MS = 320
let seq = 0

/** globos de ayuda propios, que reemplazan al del sistema en cualquier elemento con el atributo data-tip */
export function TooltipLayer() {
  const [tips, setTips] = useState<Tip[]>([])
  // el elemento y el globo que corresponden al elemento sobre el que está el cursor ahora
  const current = useRef<{ el: Element; id: number } | null>(null)

  useEffect(() => {
    /** el globo actual empieza a desvanecerse y, pasado un momento, se quita; los demás no se tocan */
    const release = (id: number) => {
      setTips((list) => list.map((t) => (t.id === id ? { ...t, live: false } : t)))
      window.setTimeout(() => setTips((list) => list.filter((t) => t.id !== id)), LEAVE_MS)
    }
    const hide = () => {
      if (!current.current) return
      release(current.current.id)
      current.current = null
    }
    // cada elemento visitado tiene su propio globo, así que al pasar rápido por varios se ven todos desvaneciéndose a la vez
    const show = (el: Element) => {
      const text = el.getAttribute('data-tip')
      if (!text) return hide()
      hide()
      const id = ++seq
      current.current = { el, id }
      setTips((list) => [...list, { id, text, rect: el.getBoundingClientRect(), live: true }])
    }
    const target = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-tip]') : null)

    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const el = target(e)
      if (el === current.current?.el) return
      if (!el) return hide()
      show(el)
    }
    const focus = (e: FocusEvent) => {
      const el = target(e)
      if (el && el.matches(':focus-visible')) show(el)
    }

    // si el elemento desaparece mientras su globo está a la vista, por ejemplo al eliminar una fila, el globo se va con él
    const watch = window.setInterval(() => {
      if (current.current && !current.current.el.isConnected) hide()
    }, 250)

    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('wheel', hide, { capture: true, passive: true })
    document.addEventListener('scroll', hide, true)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('keydown', hide, true)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      window.clearInterval(watch)
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

  return (
    <>
      {tips.map((t) => (
        <Bubble key={t.id} tip={t} />
      ))}
    </>
  )
}

/** un globo con su propia posición y su propia animación de entrada y salida */
function Bubble({ tip }: { tip: Tip }) {
  const box = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<{ left: number; top: number; arrow: number; below: boolean } | null>(null)
  const [entered, setEntered] = useState(false)

  // se coloca centrado sobre el elemento, o debajo si arriba no cabe, sin salirse de la pantalla
  useLayoutEffect(() => {
    const b = box.current
    if (!b) return
    const w = b.offsetWidth
    const h = b.offsetHeight
    const r = tip.rect
    const margin = 8
    const left = Math.min(window.innerWidth - w - margin, Math.max(margin, r.left + r.width / 2 - w / 2))
    const below = r.top - h - 10 < margin
    const top = below ? r.bottom + 10 : r.top - h - 10
    const arrow = Math.min(w - 14, Math.max(14, r.left + r.width / 2 - left))
    setAt({ left, top, arrow, below })
  }, [tip.rect])

  // al estrenarse parte invisible y en el cuadro siguiente aparece, para que la entrada se anime
  useEffect(() => {
    const f = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(f)
  }, [])

  const visible = entered && tip.live && at !== null
  const below = at?.below ?? false
  return (
    <div
      ref={box}
      role="tooltip"
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[300] w-max max-w-[18rem] break-words rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-bg shadow-lg"
      style={{
        transform: `translate(${at?.left ?? 0}px, ${(at?.top ?? 0) + (visible ? 0 : below ? -4 : 4)}px)`,
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 250ms ease, transform 250ms cubic-bezier(0.22, 1, 0.36, 1)' : 'opacity 250ms ease',
      }}
    >
      {tip.text}
      {at && <span aria-hidden className={`absolute h-2 w-2 rotate-45 bg-ink ${at.below ? '-top-1' : '-bottom-1'}`} style={{ left: at.arrow - 4 }} />}
    </div>
  )
}
