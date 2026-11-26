// reconocimiento de formatos: se mira el contenido real del archivo (su firma binaria) y no
// solo la extensión, porque la extensión la puede poner cualquiera.

export type ImageKind = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg' | 'bmp' | 'ico' | 'tiff' | 'heic'

export type SkipCategory =
  | 'video'
  | 'audio'
  | 'document'
  | 'executable'
  | 'archive'
  | 'other'
  | 'invalid'
  | 'encrypted'
  | 'unsafe'
  | 'suspicious'
  | 'unsupported'
  | 'limit'

const IMAGE_EXT: Record<string, ImageKind> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  apng: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  svg: 'svg',
  bmp: 'bmp',
  ico: 'ico',
  tif: 'tiff',
  tiff: 'tiff',
  heic: 'heic',
  heif: 'heic',
}

const VIDEO_EXT = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv', 'ts', 'mts', 'vob',
])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma', 'aiff', 'mid'])
const DOC_EXT = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'rtf', 'odt',
])
const EXEC_EXT = new Set([
  'exe', 'dll', 'bat', 'cmd', 'msi', 'js', 'mjs', 'vbs', 'ps1', 'sh', 'scr', 'jar', 'apk', 'com', 'lnk', 'reg', 'app', 'dmg', 'pif',
])
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'cab'])

// archivos que los sistemas dejan dentro de los zips y que no vale la pena ni mencionar
const JUNK_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini'])

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

export function isJunk(path: string): boolean {
  const lower = path.toLowerCase()
  if (lower.startsWith('__macosx/') || lower.includes('/__macosx/')) return true
  const base = lower.slice(lower.lastIndexOf('/') + 1)
  return JUNK_NAMES.has(base) || base.startsWith('._')
}

/** tipo de imagen según la extensión, solo para armar la lista antes de procesar */
export function kindFromExt(name: string): ImageKind | null {
  return IMAGE_EXT[extOf(name)] ?? null
}

/** categoría de un archivo que no es imagen, para avisar qué se omitió */
export function categoryFromExt(name: string): SkipCategory {
  const e = extOf(name)
  if (VIDEO_EXT.has(e)) return 'video'
  if (AUDIO_EXT.has(e)) return 'audio'
  if (EXEC_EXT.has(e)) return 'executable'
  if (ARCHIVE_EXT.has(e)) return 'archive'
  if (DOC_EXT.has(e)) return 'document'
  return 'other'
}

export function ascii(b: Uint8Array, start: number, len: number): string {
  let s = ''
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i])
  return s
}

/** lee la firma binaria y devuelve el tipo de imagen real, o null si no es una imagen */
export function sniffKind(b: Uint8Array): ImageKind | null {
  if (b.length < 4) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png'
  const head6 = ascii(b, 0, 6)
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'gif'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if (b[0] === 0x42 && b[1] === 0x4d && b.length > 26) return 'bmp'
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) {
    return 'tiff'
  }
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'avif'
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'heic'
    // el brand mayor puede ser genérico, y la imagen real se anuncia en las marcas compatibles
    const compat = ascii(b, 8, Math.min(b.length - 8, 64))
    if (compat.includes('avif')) return 'avif'
    if (compat.includes('heic') || compat.includes('heix')) return 'heic'
    return null
  }
  // un svg es texto: se busca la etiqueta <svg dentro del inicio, tolerando bom, xml y comentarios
  const text = ascii(b, 0, Math.min(b.length, 2048)).replace(/^﻿/, '')
  if (/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text)) return 'svg'
  return null
}

export interface Dimensions {
  width: number
  height: number
}

/**
 * dimensiones leídas directamente de la cabecera, sin decodificar la imagen. sirve para
 * rechazar bombas de píxeles (una imagen diminuta en disco que pide gigas al decodificarse).
 */
export function readDimensions(b: Uint8Array, kind: ImageKind): Dimensions | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  try {
    switch (kind) {
      case 'png':
        return { width: dv.getUint32(16), height: dv.getUint32(20) }
      case 'gif':
        return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) }
      case 'bmp':
        return { width: Math.abs(dv.getInt32(18, true)), height: Math.abs(dv.getInt32(22, true)) }
      case 'jpeg': {
        let i = 2
        while (i + 9 < b.length) {
          if (b[i] !== 0xff) {
            i++
            continue
          }
          const marker = b[i + 1]
          if (marker === 0xff) {
            i++
            continue
          }
          // marcadores sin longitud
          if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            i += 2
            continue
          }
          const len = dv.getUint16(i + 2)
          const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
          if (isSof) return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) }
          i += 2 + len
        }
        return null
      }
      case 'webp': {
        const chunk = ascii(b, 12, 4)
        if (chunk === 'VP8X') {
          const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16))
          const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16))
          return { width: w, height: h }
        }
        if (chunk === 'VP8L') {
          const bits = dv.getUint32(21, true)
          return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
        }
        if (chunk === 'VP8 ') {
          return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff }
        }
        return null
      }
      case 'avif':
      case 'heic': {
        // la caja ispe guarda el ancho y el alto; un archivo puede traer varias, así que se toma la mayor
        const limit = Math.min(b.length - 16, 1 << 20)
        let best: Dimensions | null = null
        for (let i = 4; i < limit; i++) {
          if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) {
            const width = dv.getUint32(i + 8)
            const height = dv.getUint32(i + 12)
            if (!best || width * height > best.width * best.height) best = { width, height }
          }
        }
        return best
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

/** true si el webp usa compresión sin pérdida (chunk VP8L) */
export function isLosslessWebp(b: Uint8Array): boolean {
  const chunk = ascii(b, 12, 4)
  if (chunk === 'VP8L') return true
  if (chunk === 'VP8X') {
    // dentro de un VP8X hay que buscar el primer chunk de imagen
    let i = 30
    while (i + 8 < b.length) {
      const id = ascii(b, i, 4)
      if (id === 'VP8L') return true
      if (id === 'VP8 ') return false
      const size = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)
      i += 8 + size + (size & 1)
    }
  }
  return false
}

export const KIND_LABEL: Record<ImageKind, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
  gif: 'GIF',
  svg: 'SVG',
  bmp: 'BMP',
  ico: 'ICO',
  tiff: 'TIFF',
  heic: 'HEIC',
}

export const KIND_MIME: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  heic: 'image/heic',
}

export const KIND_EXT: Record<ImageKind, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  svg: 'svg',
  bmp: 'bmp',
  ico: 'ico',
  tiff: 'tiff',
  heic: 'heic',
}
