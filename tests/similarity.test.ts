import { describe, expect, it } from 'vitest'
import { similarity } from '../src/lib/compress/similarity'
import { searchQuality } from '../src/lib/compress/engine'

/** una imagen de prueba con un degradado y algo de textura, sin necesitar un navegador */
function image(w: number, h: number, noise = 0, seed = 1): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  let s = seed
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5) * 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const base = 80 + (x / w) * 120 + ((x + y) % 7) * 6
      data[i] = base + rnd() * noise
      data[i + 1] = base * 0.8 + rnd() * noise
      data[i + 2] = base * 0.6 + rnd() * noise
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('similarity', () => {
  it('una imagen es idéntica a sí misma', () => {
    const a = image(64, 64)
    expect(similarity(a, a)).toBeCloseTo(1, 5)
  })

  it('baja cuando se añade ruido, y más cuanto más ruido', () => {
    const base = image(96, 96)
    const leve = similarity(base, image(96, 96, 6))
    const fuerte = similarity(base, image(96, 96, 40))
    expect(leve).toBeLessThan(1)
    expect(fuerte).toBeLessThan(leve)
  })

  it('no falla con imágenes más pequeñas que un bloque', () => {
    expect(similarity(image(4, 4), image(4, 4, 30))).toBe(1)
  })
})

describe('searchQuality', () => {
  // la similitud sube con la calidad: se espera la calidad mínima que alcance el objetivo
  const score = (q: number) => 0.5 + q / 200

  it('encuentra la calidad mínima que cumple el umbral en pocas pruebas', async () => {
    let probes = 0
    const q = await searchQuality(async (q) => (probes++, score(q)), 0.9, 40, 98, 85, 6)
    expect(q).toBe(80)
    expect(probes).toBeLessThanOrEqual(6)
  })

  it('devuelve null si ni la calidad más alta llega al umbral', async () => {
    expect(await searchQuality(async (q) => score(q) - 0.2, 0.95, 40, 98, 85, 6)).toBeNull()
  })

  it('sube desde un punto de partida demasiado bajo', async () => {
    const q = await searchQuality(async (q) => score(q), 0.95, 40, 98, 45, 6)
    expect(q).not.toBeNull()
    expect(score(q!)).toBeGreaterThanOrEqual(0.95)
  })
})
