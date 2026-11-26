import { Fragment, type ReactNode } from 'react'
import { useInView } from './Reveal'

/** resalta una palabra con el color primario y la subraya con un trazo que se dibuja como a pincel */
export function Mark({ children, underline = true }: { children: ReactNode; underline?: boolean }) {
  const [ref, seen] = useInView<HTMLSpanElement>()
  const draw = (delay: number): React.CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: seen ? 0 : 1,
    transition: `stroke-dashoffset 0.9s cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms`,
  })
  return (
    <span ref={ref} className="relative inline-block text-brand">
      {children}
      {underline && (
        <svg aria-hidden viewBox="0 0 200 16" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-2 left-[-3%] h-[0.42em] w-[106%] overflow-visible">
          {/* un primer trazo largo y otro más corto y fino encima, como dos pasadas de pincel */}
          <path d="M3 10 C 28 4, 52 13, 96 8 S 168 3, 197 9" pathLength={1} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" style={draw(450)} />
          <path d="M20 14 C 62 10, 110 15, 176 11" pathLength={1} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" style={draw(1150)} />
        </svg>
      )}
    </span>
  )
}

/** convierte las palabras marcadas con asteriscos en un texto resaltado y subrayado */
export function Marked({ text, underline = true }: { text: string; underline?: boolean }) {
  return (
    <>
      {text.split('*').map((part, i) => (
        <Fragment key={i}>{i % 2 ? <Mark underline={underline}>{part}</Mark> : part}</Fragment>
      ))}
    </>
  )
}
