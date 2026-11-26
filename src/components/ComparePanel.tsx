import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, MoveHorizontal, X } from 'lucide-react'
import { FadeImg } from './FadeImg'
import { useWorkspace } from '../store/workspace'
import { originalBlob } from '../lib/download'
import { formatBytes } from '../lib/format'
import { useLocale, useT } from '../i18n'

/** comparador con deslizador que muestra el original a la izquierda y la comprimida a la derecha */
export function ComparePanel({ id, onClose: onClosed }: { id: string; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  // se abre en el cuadro siguiente para que la transición arranque desde el estado cerrado
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])
  // al cerrar primero se desvanece y solo después se desmonta
  const close = useCallback(() => {
    setShown(false)
    window.setTimeout(onClosed, 280)
  }, [onClosed])
  const t = useT()
  const locale = useLocale()
  const item = useWorkspace((s) => s.items[id])
  const [urls, setUrls] = useState<{ a: string; b: string } | null>(null)
  const [pos, setPos] = useState(50)
  const [zoom, setZoom] = useState(false)
  const [ratio, setRatio] = useState<{ w: number; h: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    let a = ''
    let b = ''
    ;(async () => {
      if (!item?.result?.blob) return
      const orig = await originalBlob(item)
      if (!alive) return
      a = URL.createObjectURL(orig)
      b = URL.createObjectURL(item.result.blob)
      setUrls({ a, b })
    })()
    return () => {
      alive = false
      if (a) URL.revokeObjectURL(a)
      if (b) URL.revokeObjectURL(b)
    }
    // solo importa al abrir, ya que el resultado no cambia mientras se mira
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 3))
      if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 3))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!item?.result) return null

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  const aspect = ratio ? ratio.w / ratio.h : 4 / 3

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center bg-transparent p-3 backdrop-blur-md transition-opacity duration-300 sm:p-6 ${shown ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-label={t('compare.title')}
    >
      <div
        className={`flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift transition-all duration-300 ease-out ${
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.97] opacity-0'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">{t('compare.title')}</p>
            <p className="truncate text-sm text-muted">{item.path}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`grid h-9 w-9 place-items-center rounded-xl hover:bg-sunken ${zoom ? 'bg-brand-soft text-brand' : 'text-muted'}`}
              onClick={() => setZoom((z) => !z)}
              aria-pressed={zoom}
              title="100%"
            >
              <Maximize2 size={17} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-sunken" onClick={close} aria-label={t('compare.close')}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div data-lenis-prevent="" className="soft-scroll min-h-0 flex-1 overflow-auto bg-sunken p-3 sm:p-5">
          {!urls ? (
            <div className="fade-in grid h-60 place-items-center text-muted">
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="spin" /> {t('compare.loading')}
              </span>
            </div>
          ) : (
            <div
              ref={box}
              className="checker relative mx-auto touch-none select-none overflow-hidden rounded-xl"
              style={
                zoom && ratio
                  ? { width: ratio.w, maxWidth: 'none', aspectRatio: aspect }
                  : { aspectRatio: aspect, maxHeight: '64vh', maxWidth: '100%', width: `min(100%, calc(64vh * ${aspect}))` }
              }
              onPointerDown={(e) => {
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                move(e.clientX)
              }}
              onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
            >
              <FadeImg
                src={urls.b}
                alt={t('compare.compressed')}
                draggable={false}
                className="absolute inset-0 h-full w-full object-fill"
                onLoad={(e) => setRatio({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
              <FadeImg
                src={urls.a}
                alt={t('compare.original')}
                draggable={false}
                className="absolute inset-0 h-full w-full object-fill"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              />
              <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" style={{ left: `${pos}%` }}>
                <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand shadow-lg">
                  <MoveHorizontal size={18} />
                </span>
              </div>
              <Label side="left" text={`${t('compare.original')} · ${formatBytes(item.size, locale)}`} />
              <Label side="right" text={`${t('compare.compressed')} · ${formatBytes(item.result.outSize, locale)}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ side, text }: { side: 'left' | 'right'; text: string }) {
  return (
    <span
      className={`pointer-events-none absolute top-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      {text}
    </span>
  )
}
