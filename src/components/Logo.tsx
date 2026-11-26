import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Squeezo">
      <img src="/logo-256.png" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-[9px]" />
      <span className="font-display text-[1.35rem] font-extrabold tracking-tight" style={{ fontStretch: '88%' }}>
        Squeezo
      </span>
    </Link>
  )
}
