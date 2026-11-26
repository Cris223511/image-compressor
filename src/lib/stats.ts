// contador global de imágenes comprimidas. al servidor solo viaja un número, nunca archivos ni nombres.

/** la cifra global, o null si no se pudo obtener (por ejemplo, sin conexión o en desarrollo local) */
export async function fetchTotal(): Promise<number | null> {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' })
    if (!res.ok) return null
    const { total } = (await res.json()) as { total?: number }
    return typeof total === 'number' ? total : null
  } catch {
    return null
  }
}

/** suma al contador las imágenes que se acaban de comprimir; si falla, se ignora sin avisar */
export function reportCompressed(n: number) {
  if (n < 1) return
  void fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ n }),
    keepalive: true,
  }).catch(() => undefined)
}
