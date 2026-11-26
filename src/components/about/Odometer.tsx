/**
 * número cuyos dígitos giran como un odómetro hasta quedar en su valor. cuanto más grande el
 * número, más vueltas dan los dígitos en el mismo tiempo, así que se ve más rápido.
 */
export function Odometer({ value, active, duration = 1800 }: { value: number; active: boolean; duration?: number }) {
  const chars = value.toLocaleString().split('')
  const spins = 2 + Math.min(4, Math.floor(Math.log10(Math.max(1, value))))
  let col = 0

  return (
    <span role="img" className="inline-flex tabular-nums leading-none" aria-label={value.toLocaleString()}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <Column key={i} digit={Number(ch)} spins={spins} active={active} delay={col++ * 110} duration={duration} />
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

function Column({ digit, spins, active, delay, duration }: { digit: number; spins: number; active: boolean; delay: number; duration: number }) {
  const target = spins * 10 + digit
  return (
    <span aria-hidden className="relative inline-block h-[1em] overflow-hidden align-top" style={{ lineHeight: 1 }}>
      <span
        className="block"
        style={{
          transform: `translate3d(0, ${active ? -target : 0}em, 0)`,
          transition: active ? `transform ${duration}ms cubic-bezier(0.16, 0.84, 0.24, 1) ${delay}ms` : 'none',
          willChange: 'transform',
        }}
      >
        {Array.from({ length: (spins + 1) * 10 }, (_, k) => (
          <span key={k} className="block" style={{ height: '1em', lineHeight: 1 }}>
            {k % 10}
          </span>
        ))}
      </span>
    </span>
  )
}
