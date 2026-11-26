// mide cuánto se parece una imagen comprimida a su original con ssim calculado por bloques de
// 8x8 sobre luminancia y los dos canales de color. no es una métrica perfecta, pero se mueve
// parecido a lo que ve el ojo: ruido en zonas lisas, bordes borrosos y bandas de color.

const C1 = (0.01 * 255) ** 2
const C2 = (0.03 * 255) ** 2
const BLOCK = 8

/** tope de bloques que se evalúan; en fotos enormes se muestrea una rejilla uniforme */
const MAX_BLOCKS = 90_000

export function similarity(a: ImageData, b: ImageData): number {
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const bw = Math.floor(w / BLOCK)
  const bh = Math.floor(h / BLOCK)
  if (bw === 0 || bh === 0) return 1

  const total = bw * bh
  const step = Math.max(1, Math.ceil(Math.sqrt(total / MAX_BLOCKS)))

  const da = a.data
  const db = b.data
  let sumY = 0
  let sumCb = 0
  let sumCr = 0
  let count = 0
  // puntaje de cada bloque, en un arreglo tipado para poder ordenarlo sin comparador
  const lows = new Float32Array(Math.ceil(bh / step) * Math.ceil(bw / step))

  for (let by = 0; by < bh; by += step) {
    for (let bx = 0; bx < bw; bx += step) {
      // acumuladores de las tres bandas: media, varianza y covarianza por bloque
      let ay = 0, by_ = 0, ayy = 0, byy = 0, aby = 0
      let acb = 0, bcb = 0, acbcb = 0, bcbcb = 0, abcb = 0
      let acr = 0, bcr = 0, acrcr = 0, bcrcr = 0, abcr = 0

      for (let y = 0; y < BLOCK; y++) {
        let i = (((by * BLOCK + y) * a.width) + bx * BLOCK) * 4
        let j = (((by * BLOCK + y) * b.width) + bx * BLOCK) * 4
        for (let x = 0; x < BLOCK; x++, i += 4, j += 4) {
          const r1 = da[i], g1 = da[i + 1], bl1 = da[i + 2]
          const r2 = db[j], g2 = db[j + 1], bl2 = db[j + 2]
          const y1 = 0.299 * r1 + 0.587 * g1 + 0.114 * bl1
          const y2 = 0.299 * r2 + 0.587 * g2 + 0.114 * bl2
          const cb1 = bl1 - y1
          const cb2 = bl2 - y2
          const cr1 = r1 - y1
          const cr2 = r2 - y2
          ay += y1; by_ += y2; ayy += y1 * y1; byy += y2 * y2; aby += y1 * y2
          acb += cb1; bcb += cb2; acbcb += cb1 * cb1; bcbcb += cb2 * cb2; abcb += cb1 * cb2
          acr += cr1; bcr += cr2; acrcr += cr1 * cr1; bcrcr += cr2 * cr2; abcr += cr1 * cr2
        }
      }

      const n = BLOCK * BLOCK
      const sy = blockSsim(ay, by_, ayy, byy, aby, n)
      const scb = blockSsim(acb, bcb, acbcb, bcbcb, abcb, n)
      const scr = blockSsim(acr, bcr, acrcr, bcrcr, abcr, n)
      sumY += sy
      sumCb += scb
      sumCr += scr
      lows[count++] = 0.7 * sy + 0.15 * scb + 0.15 * scr
    }
  }

  const mean = (0.7 * sumY + 0.15 * sumCb + 0.15 * sumCr) / count

  // la media sola esconde defectos locales: se mezcla con el peor 2% de los bloques
  const sorted = lows.subarray(0, count).sort()
  const worstN = Math.max(1, Math.floor(count * 0.02))
  let worst = 0
  for (let k = 0; k < worstN; k++) worst += sorted[k]
  worst /= worstN

  return 0.85 * mean + 0.15 * worst
}

function blockSsim(sa: number, sb: number, saa: number, sbb: number, sab: number, n: number): number {
  const ma = sa / n
  const mb = sb / n
  const va = saa / n - ma * ma
  const vb = sbb / n - mb * mb
  const cov = sab / n - ma * mb
  return ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2))
}
