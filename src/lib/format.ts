// formato de números para mostrar pesos y porcentajes con el idioma activo

export function formatBytes(n: number, locale: string): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2
  return `${v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${units[i]}`
}

/** porcentaje ahorrado para etiquetas, que nunca marca 0% si hubo algo de ahorro */
export function formatSaved(fraction: number, locale: string): string {
  return `${Math.max(1, Math.round(fraction * 100)).toLocaleString(locale)}%`
}
