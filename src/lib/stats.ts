// contador local de imágenes comprimidas en este navegador. no hay servidor ni seguimiento:
// el número vive solo en el almacenamiento de quien usa la herramienta.

const KEY = 'squeezo-total'

export function readTotal(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(KEY) ?? '0', 10) || 0)
  } catch {
    return 0
  }
}

export function addToTotal(n: number) {
  try {
    localStorage.setItem(KEY, String(readTotal() + n))
  } catch {
    /* sin almacenamiento, el contador simplemente no avanza */
  }
}
