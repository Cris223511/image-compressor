import { describe, expect, it } from 'vitest'
import { categoryFromExt, isJunk, isLosslessWebp, kindFromExt, readDimensions, sniffKind } from '../src/lib/formats'

const bytes = (...parts: (number | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : [p])))

describe('sniffKind', () => {
  it('reconoce las firmas de las imágenes habituales', () => {
    expect(sniffKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('jpeg')
    expect(sniffKind(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png')
    expect(sniffKind(bytes('GIF89a', 1, 0, 1, 0))).toBe('gif')
    expect(sniffKind(bytes('RIFF', 0, 0, 0, 0, 'WEBP', 'VP8 '))).toBe('webp')
    expect(sniffKind(bytes(0, 0, 0, 0x1c, 'ftypavif', 0, 0, 0, 0))).toBe('avif')
    expect(sniffKind(bytes(0, 0, 0, 0x18, 'ftypheic', 0, 0, 0, 0))).toBe('heic')
  })

  it('reconoce un svg aunque venga tras xml y comentarios', () => {
    const svg = '<?xml version="1.0"?>\n<!-- hecho con un editor -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    expect(sniffKind(bytes(svg))).toBe('svg')
  })

  it('no se deja engañar por la extensión ni por otros formatos', () => {
    expect(sniffKind(bytes('esto es solo texto'))).toBeNull()
    expect(sniffKind(bytes('MZ', 0x90, 0, 3, 0))).toBeNull()
    expect(sniffKind(bytes('PK', 3, 4, 0, 0))).toBeNull()
    expect(sniffKind(bytes(0, 0, 0, 0x18, 'ftypmp42', 0, 0, 0, 0))).toBeNull()
    expect(sniffKind(bytes())).toBeNull()
  })
})

describe('readDimensions', () => {
  it('lee el tamaño de un png desde su cabecera', () => {
    const png = bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 'IHDR', 0, 0, 0x0c, 0x80, 0, 0, 0x07, 0xd0)
    expect(readDimensions(png, 'png')).toEqual({ width: 3200, height: 2000 })
  })

  it('lee el tamaño de un gif', () => {
    expect(readDimensions(bytes('GIF89a', 0xe0, 0x01, 0x0e, 0x01), 'gif')).toEqual({ width: 480, height: 270 })
  })

  it('encuentra el marcador SOF de un jpg saltando otros segmentos', () => {
    const jpg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x04, 0x00, 0x06, 0x00, 3, 1, 0x22, 0)
    expect(readDimensions(jpg, 'jpeg')).toEqual({ width: 1536, height: 1024 })
  })

  it('devuelve null si el archivo está truncado', () => {
    expect(readDimensions(bytes(0xff, 0xd8, 0xff), 'jpeg')).toBeNull()
  })
})

describe('utilidades de nombres', () => {
  it('clasifica por extensión lo que no es imagen', () => {
    expect(categoryFromExt('clip.MP4')).toBe('video')
    expect(categoryFromExt('cancion.mp3')).toBe('audio')
    expect(categoryFromExt('setup.exe')).toBe('executable')
    expect(categoryFromExt('script.js')).toBe('executable')
    expect(categoryFromExt('otro.zip')).toBe('archive')
    expect(categoryFromExt('informe.pdf')).toBe('document')
    expect(categoryFromExt('rareza.xyz')).toBe('other')
    expect(kindFromExt('foto.JPG')).toBe('jpeg')
    expect(kindFromExt('foto.txt')).toBeNull()
  })

  it('ignora la basura que dejan los sistemas dentro de los zips', () => {
    expect(isJunk('__MACOSX/fotos/._a.jpg')).toBe(true)
    expect(isJunk('fotos/.DS_Store')).toBe(true)
    expect(isJunk('fotos/Thumbs.db')).toBe(true)
    expect(isJunk('fotos/a.jpg')).toBe(false)
  })

  it('distingue un webp sin pérdida', () => {
    expect(isLosslessWebp(bytes('RIFF', 0, 0, 0, 0, 'WEBP', 'VP8L', 0, 0, 0, 0))).toBe(true)
    expect(isLosslessWebp(bytes('RIFF', 0, 0, 0, 0, 'WEBP', 'VP8 ', 0, 0, 0, 0))).toBe(false)
  })
})
