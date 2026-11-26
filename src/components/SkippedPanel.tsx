import { useMemo, useState } from 'react'
import { ChevronDown, FileAudio, FileText, FileVideo, FileWarning, Package, ShieldAlert } from 'lucide-react'
import { Collapse } from './Collapse'
import { useWorkspace } from '../store/workspace'
import type { SkipCategory } from '../lib/formats'
import { formatBytes } from '../lib/format'
import { MAX_IMAGES } from '../config/limits'
import { useLocale, useT } from '../i18n'

const ICONS: Record<SkipCategory, typeof FileText> = {
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  executable: ShieldAlert,
  archive: Package,
  other: FileText,
  invalid: FileWarning,
  encrypted: FileWarning,
  unsafe: ShieldAlert,
  suspicious: ShieldAlert,
  unsupported: FileWarning,
  limit: FileWarning,
}

// las categorías que tienen que ver con seguridad se destacan en otro color
const DANGER = new Set<SkipCategory>(['executable', 'unsafe', 'suspicious'])
const MAX_LISTED = 40

export function SkippedPanel() {
  const t = useT()
  const locale = useLocale()
  const skipped = useWorkspace((s) => s.skipped)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<SkipCategory | null>(null)

  const groups = useMemo(() => {
    const map = new Map<SkipCategory, { count: number; bytes: number; paths: string[] }>()
    for (const s of skipped) {
      const g = map.get(s.category) ?? { count: 0, bytes: 0, paths: [] }
      g.count++
      g.bytes += s.size
      if (g.paths.length < MAX_LISTED) g.paths.push(s.path)
      map.set(s.category, g)
    }
    // los avisos de seguridad primero y luego por cantidad
    return [...map.entries()].sort((a, b) => Number(DANGER.has(b[0])) - Number(DANGER.has(a[0])) || b[1].count - a[1].count)
  }, [skipped])

  return (
    <div className="rise mt-5 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <button
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="font-display text-lg font-bold">{t('skip.title', { count: skipped.length })}</p>
          <p className="text-sm text-muted">{t('skip.hint')}</p>
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold text-brand">
          {open ? t('skip.hide') : t('skip.show')}
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* resumen siempre a la vista, para que se note qué se omitió sin abrir nada */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {groups.map(([cat, g]) => {
          const Icon = ICONS[cat]
          const danger = DANGER.has(cat)
          return (
            <span key={cat} className={`chip ${danger ? 'bg-warn-soft text-warn' : 'bg-sunken text-muted'}`}>
              <Icon size={13} /> {g.count} · {t(`skip.cat.${cat}`, { max: MAX_IMAGES })}
            </span>
          )
        })}
      </div>

      <Collapse open={open}>
        <div className="border-t border-line">
          {groups.map(([cat, g]) => (
            <div key={cat} className="border-b border-line/70 last:border-b-0">
              <button
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-sunken/60"
                onClick={() => setExpanded(expanded === cat ? null : cat)}
              >
                <span className="text-sm font-semibold">
                  {t(`skip.cat.${cat}`, { max: MAX_IMAGES })} <span className="font-normal text-muted">({g.count})</span>
                </span>
                <span className="text-xs text-muted">{formatBytes(g.bytes, locale)}</span>
              </button>
              {expanded === cat && (
                <ul className="soft-scroll max-h-56 overflow-y-auto bg-sunken/50 px-5 py-2 text-xs text-muted">
                  {g.paths.map((p) => (
                    <li key={p} className="truncate py-0.5">
                      {p}
                    </li>
                  ))}
                  {g.count > g.paths.length && <li className="py-0.5">… +{g.count - g.paths.length}</li>}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  )
}
