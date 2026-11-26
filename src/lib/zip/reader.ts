// lector de zips que no carga el archivo entero en memoria. solo se leen el final (donde está
// el índice) y, cuando hace falta, el trozo exacto de cada entrada. así un zip de varios gigas
// se explora al instante y solo se descomprime lo que de verdad se va a procesar.

import { Inflate } from 'fflate'
import { MAX_ENTRY_BYTES, MAX_RATIO, MAX_ZIP_ENTRIES, RATIO_MIN_BYTES } from '../../config/limits'
import type { SkipCategory } from '../formats'

export interface ZipEntry {
  /** ruta ya normalizada, siempre con / y sin partes peligrosas */
  path: string
  method: number
  compressedSize: number
  size: number
  offset: number
  isDir: boolean
  /** motivo por el que no se puede procesar, si lo hay */
  problem: SkipCategory | null
}

export class ZipError extends Error {
  constructor(public code: 'notZip' | 'tooMany' | 'corrupt' | 'bomb' | 'encrypted' | 'unsupported') {
    super(code)
  }
}

/** bytes comprimidos que se inflan de una vez: con deflate, 16 KB no pueden dar más de unos 16 MB */
const INFLATE_STEP = 16 * 1024

const SIG_EOCD = 0x06054b50
const SIG_EOCD64 = 0x06064b50
const SIG_LOC64 = 0x07064b50
const SIG_CEN = 0x02014b50
const SIG_LOC = 0x04034b50

async function readSlice(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer())
}

function decodeName(raw: Uint8Array, utf8: boolean): string {
  if (utf8) return new TextDecoder('utf-8').decode(raw)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    // los zips viejos de windows guardan los nombres en una página de códigos local
    return new TextDecoder('windows-1252').decode(raw)
  }
}

/**
 * limpia la ruta de una entrada. si trae intentos de salir de la carpeta (../), letras de
 * unidad o rutas absolutas devuelve null, y la entrada se descarta como insegura.
 */
export function safePath(name: string): string | null {
  const unified = name.replace(/\\/g, '/')
  if (/^[a-zA-Z]:/.test(unified)) return null
  const parts = unified.split('/').filter((p) => p !== '' && p !== '.')
  if (parts.some((p) => p === '..' || p.includes('\0'))) return null
  // una ruta con miles de niveles o de caracteres solo sirve para tumbar el árbol de la interfaz
  if (parts.length === 0 || parts.length > 32 || unified.length > 512) return null
  return parts.join('/')
}

export async function readZipDirectory(file: File): Promise<ZipEntry[]> {
  const size = file.size
  if (size < 22) throw new ZipError('notZip')

  const tailLen = Math.min(size, 65557)
  const tail = await readSlice(file, size - tailLen, size)
  const tdv = new DataView(tail.buffer)

  let eocd = -1
  for (let i = tailLen - 22; i >= 0; i--) {
    if (tdv.getUint32(i, true) === SIG_EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ZipError('notZip')

  let total = tdv.getUint16(eocd + 10, true)
  let cdSize = tdv.getUint32(eocd + 12, true)
  let cdOffset = tdv.getUint32(eocd + 16, true)

  // valores al tope indican zip64: el índice real está en otro registro
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const locPos = eocd - 20
    if (locPos < 0 || tdv.getUint32(locPos, true) !== SIG_LOC64) throw new ZipError('corrupt')
    const eocd64Offset = Number(tdv.getBigUint64(locPos + 8, true))
    const rec = await readSlice(file, eocd64Offset, eocd64Offset + 56)
    const rdv = new DataView(rec.buffer)
    if (rdv.getUint32(0, true) !== SIG_EOCD64) throw new ZipError('corrupt')
    total = Number(rdv.getBigUint64(32, true))
    cdSize = Number(rdv.getBigUint64(40, true))
    cdOffset = Number(rdv.getBigUint64(48, true))
  }

  if (total > MAX_ZIP_ENTRIES) throw new ZipError('tooMany')
  if (cdOffset + cdSize > size) throw new ZipError('corrupt')

  const cd = await readSlice(file, cdOffset, cdOffset + cdSize)
  const dv = new DataView(cd.buffer)
  const entries: ZipEntry[] = []

  let p = 0
  while (p + 46 <= cd.length && dv.getUint32(p, true) === SIG_CEN) {
    // el total declarado en el final del zip puede mentir: se cuenta lo que de verdad se lee
    if (entries.length >= MAX_ZIP_ENTRIES) throw new ZipError('tooMany')
    const flags = dv.getUint16(p + 8, true)
    const method = dv.getUint16(p + 10, true)
    let csize = dv.getUint32(p + 20, true)
    let usize = dv.getUint32(p + 24, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    let offset = dv.getUint32(p + 42, true)

    const name = decodeName(cd.subarray(p + 46, p + 46 + nameLen), (flags & 0x800) !== 0)

    // el campo extra zip64 trae los valores reales cuando los normales están al tope
    if (usize === 0xffffffff || csize === 0xffffffff || offset === 0xffffffff) {
      let e = p + 46 + nameLen
      const eEnd = e + extraLen
      while (e + 4 <= eEnd) {
        const id = dv.getUint16(e, true)
        const len = dv.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (usize === 0xffffffff) {
            usize = Number(dv.getBigUint64(q, true))
            q += 8
          }
          if (csize === 0xffffffff) {
            csize = Number(dv.getBigUint64(q, true))
            q += 8
          }
          if (offset === 0xffffffff) {
            offset = Number(dv.getBigUint64(q, true))
          }
          break
        }
        e += 4 + len
      }
    }

    const isDir = name.endsWith('/') || name.endsWith('\\')
    const path = safePath(name)
    let problem: SkipCategory | null = null
    if (path === null) problem = 'unsafe'
    else if (flags & 0x1) problem = 'encrypted'
    else if (method !== 0 && method !== 8) problem = 'unsupported'
    else if (usize > MAX_ENTRY_BYTES) problem = 'limit'
    // los datos guardados no pueden pesar distinto de lo declarado ni salirse del archivo
    else if (csize > MAX_ENTRY_BYTES || (method === 0 && csize !== usize) || offset + 30 + csize > size) problem = 'suspicious'
    else if (usize > RATIO_MIN_BYTES && csize > 0 && usize / csize > MAX_RATIO) problem = 'suspicious'

    entries.push({
      path: path ?? name,
      method,
      compressedSize: csize,
      size: usize,
      offset,
      isDir,
      problem,
    })

    p += 46 + nameLen + extraLen + commentLen
  }

  return entries
}

/** descomprime una entrada concreta, cortando si crece más de lo que su cabecera declara */
export async function extractZipEntry(file: File, entry: ZipEntry): Promise<Uint8Array> {
  if (entry.problem) throw new ZipError(entry.problem === 'encrypted' ? 'encrypted' : 'unsupported')

  const header = await readSlice(file, entry.offset, entry.offset + 30)
  const hdv = new DataView(header.buffer)
  if (hdv.getUint32(0, true) !== SIG_LOC) throw new ZipError('corrupt')
  const dataStart = entry.offset + 30 + hdv.getUint16(26, true) + hdv.getUint16(28, true)
  const raw = await readSlice(file, dataStart, dataStart + entry.compressedSize)

  if (entry.method === 0) return raw

  const out = new Uint8Array(entry.size)
  let written = 0
  const inflater = new Inflate((chunk) => {
    // si el archivo dice pesar una cosa y al abrirlo pesa más, la cabecera miente
    if (written + chunk.length > entry.size) throw new ZipError('bomb')
    out.set(chunk, written)
    written += chunk.length
  })
  try {
    // se inflan trozos pequeños: así el tope se aplica enseguida y una bomba no llega a materializarse
    if (!raw.length) inflater.push(raw, true)
    for (let i = 0; i < raw.length; i += INFLATE_STEP) {
      const end = Math.min(raw.length, i + INFLATE_STEP)
      inflater.push(raw.subarray(i, end), end === raw.length)
    }
  } catch (e) {
    if (e instanceof ZipError) throw e
    throw new ZipError('corrupt')
  }
  if (written !== entry.size) throw new ZipError('corrupt')
  return out
}
