import { describe, expect, it } from 'vitest'
import { exifOrientation, stripJpegMetaLossless } from '../src/lib/compress/engine'

const bytes = (...parts: (number | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : [p])))

/** un segmento APP1 con exif mínimo que declara la orientación dada */
function exif(orientation: number): Uint8Array {
  const tiff = [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0]
  const body = [...bytes('Exif', 0, 0), ...tiff]
  const len = body.length + 2
  return bytes(0xff, 0xe1, len >> 8, len & 255, ...body)
}

/** un jpg diminuto: SOI, JFIF, los segmentos pedidos, una tabla y el inicio del escaneo */
function jpeg(...segments: Uint8Array[]): Uint8Array {
  const jfif = bytes(0xff, 0xe0, 0, 6, 0, 0, 0, 0)
  const tail = bytes(0xff, 0xdb, 0, 4, 0, 1, 0xff, 0xda, 0, 4, 1, 2, 9, 9, 0xff, 0xd9)
  return new Uint8Array([0xff, 0xd8, ...jfif, ...segments.flatMap((s) => [...s]), ...tail])
}

describe('exifOrientation', () => {
  it('lee la orientación del exif', () => {
    expect(exifOrientation(exif(6))).toBe(6)
    expect(exifOrientation(exif(1))).toBe(1)
  })

  it('sin exif se asume orientación normal', () => {
    expect(exifOrientation(bytes(0xff, 0xe1, 0, 4, 1, 2))).toBe(1)
  })
})

describe('stripJpegMetaLossless', () => {
  it('quita el exif y los comentarios sin tocar el resto', () => {
    const comment = bytes(0xff, 0xfe, 0, 7, 104, 111, 108, 97, 33)
    const input = jpeg(exif(1), comment)
    const out = stripJpegMetaLossless(input)!
    expect(out.length).toBeLessThan(input.length)
    // sigue siendo un jpg: empieza con SOI, conserva el jfif y termina con EOI
    expect([...out.slice(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe0])
    expect([...out.slice(-2)]).toEqual([0xff, 0xd9])
    // y ya no queda ningún segmento APP1 ni comentario
    const hasMarker = (m: number) => out.some((v, i) => v === 0xff && out[i + 1] === m)
    expect(hasMarker(0xe1)).toBe(false)
    expect(hasMarker(0xfe)).toBe(false)
  })

  it('no toca una foto que depende de la orientación del exif', () => {
    expect(stripJpegMetaLossless(jpeg(exif(6)))).toBeNull()
  })

  it('devuelve el mismo contenido de imagen: todo desde el escaneo en adelante queda idéntico', () => {
    const input = jpeg(exif(1))
    const out = stripJpegMetaLossless(input)!
    const sos = (b: Uint8Array) => b.slice(b.findIndex((v, i) => v === 0xff && b[i + 1] === 0xda))
    expect(sos(out)).toEqual(sos(input))
  })
})
