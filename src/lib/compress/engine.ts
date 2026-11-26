// motor de compresión. corre dentro de un web worker, así que nunca toca el DOM.
// la regla de oro es que el resultado nunca sea peor que el original, de modo que si no se logra
// reducir el peso sin que se note, el archivo original se conserva tal cual.

import { MAX_PIXELS } from '../../config/limits'
import {
  KIND_MIME,
  ascii,
  isLosslessWebp,
  readDimensions,
  sniffKind,
  type Dimensions,
  type ImageKind,
} from '../formats'
import { JobError, failure, readSource, toArrayBuffer } from './source'
import { similarity } from './similarity'
import {
  TARGET_SCORE,
  type JobRequest,
  type JobResult,
  type OutputFormat,
  type ResultNote,
  type Settings,
} from './types'

type Ok = Extract<JobResult, { ok: true }>

export async function runJob(req: JobRequest): Promise<JobResult> {
  try {
    const bytes = await readSource(req.source)
    return { ...(await processBytes(bytes, req.settings)), id: req.id }
  } catch (e) {
    return failure(req.id, e)
  }
}

/** procesa los bytes de una imagen ya leída. los svg y demás casos especiales se resuelven aquí */
export async function processBytes(bytes: Uint8Array, settings: Settings): Promise<Omit<Ok, 'id'>> {
  const kind = sniffKind(bytes)
  if (!kind) throw new JobError('notImage')

  const dims = readDimensions(bytes, kind)
  if (dims && dims.width * dims.height > MAX_PIXELS) throw new JobError('pixels')

  if (kind === 'svg') return compressSvg(bytes, settings)
  if (kind === 'ico') return keep(bytes, kind, dims, 'noRecompress')
  if (kind === 'gif') throw new JobError('unsupported', 'gif')
  if (isAnimated(bytes, kind)) return keep(bytes, kind, dims, 'noRecompress')

  return compressRaster(bytes, kind, dims, settings)
}

// ---------------------------------------------------------------------------------------
// utilidades

function keep(
  bytes: Uint8Array,
  kind: ImageKind,
  dims: Dimensions | null,
  note: ResultNote,
  extra: Partial<Ok> = {},
): Omit<Ok, 'id'> {
  return {
    ok: true,
    bytes: null,
    inKind: kind,
    outKind: kind,
    width: dims?.width ?? 0,
    height: dims?.height ?? 0,
    originalSize: bytes.length,
    outSize: bytes.length,
    note,
    ...extra,
  }
}

/** detecta png, webp y avif animados, que se dejan intactos para no romper la animación */
function isAnimated(b: Uint8Array, kind: ImageKind): boolean {
  if (kind === 'png') {
    let i = 8
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
    while (i + 8 <= b.length) {
      const len = dv.getUint32(i)
      const type = ascii(b, i + 4, 4)
      if (type === 'acTL') return true
      if (type === 'IDAT') return false
      i += 12 + len
    }
    return false
  }
  if (kind === 'webp') {
    return ascii(b, 12, 4) === 'VP8X' && (b[20] & 0x02) !== 0
  }
  if (kind === 'avif') {
    return ascii(b, 8, 4) === 'avis'
  }
  return false
}

function targetOutput(kind: ImageKind, out: OutputFormat): ImageKind {
  if (out !== 'keep') return out
  if (kind === 'bmp' || kind === 'tiff') return 'png'
  if (kind === 'heic') return 'jpeg'
  return kind
}

async function decodeBitmap(
  bytes: Uint8Array,
  mime: string,
  opts: { maxSide: number; flatten: boolean; keepOrientation: boolean },
): Promise<ImageData> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }), {
      imageOrientation: opts.keepOrientation ? 'none' : 'from-image',
      premultiplyAlpha: 'none',
    })
  } catch {
    // tiff y heic no los decodifica todo navegador, así que se avisa con claridad en vez de fallar a ciegas
    const kind = sniffKind(bytes)
    throw kind === 'tiff' || kind === 'heic' ? new JobError('unsupported', kind) : new JobError('decode')
  }
  let w = bmp.width
  let h = bmp.height
  if (w * h > MAX_PIXELS) {
    bmp.close()
    throw new JobError('pixels')
  }
  if (opts.maxSide > 0 && Math.max(w, h) > opts.maxSide) {
    const k = opts.maxSide / Math.max(w, h)
    w = Math.max(1, Math.round(w * k))
    h = Math.max(1, Math.round(h * k))
  }
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  if (opts.flatten) {
    // el jpg no admite transparencia, por eso se rellena de blanco para que no quede negro
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return ctx.getImageData(0, 0, w, h)
}

/** decodifica un resultado ya comprimido para poder medirlo contra el original */
async function decodeBytes(bytes: Uint8Array, mime: string): Promise<ImageData> {
  try {
    return await decodeBitmap(bytes, mime, { maxSide: 0, flatten: false, keepOrientation: true })
  } catch {
    // un navegador sin soporte nativo (avif en algunos safari) cae a los decodificadores wasm
    const buf = bytes.slice().buffer
    if (mime === 'image/avif') return (await import('@jsquash/avif')).decode(buf) as Promise<ImageData>
    if (mime === 'image/webp') return (await import('@jsquash/webp')).decode(buf)
    return (await import('@jsquash/jpeg')).decode(buf)
  }
}

interface Candidate {
  bytes: Uint8Array
  quality: number
  score: number
}

type Encoder = (img: ImageData, q: number) => Promise<Uint8Array>

/**
 * para no codificar cuatro veces una foto de 24 megapíxeles, la búsqueda de calidad se hace
 * sobre un mosaico de unos pocos recortes de la imagen, escogidos por su nivel de detalle.
 * al final se verifica sobre la imagen completa, así que el resultado sigue siendo fiable.
 */
function buildMosaic(src: ImageData): ImageData {
  const { width: w, height: h, data } = src
  if (w * h <= 1_300_000) return src

  const T = Math.max(64, Math.min(512, Math.floor(Math.min(w, h) / 16) * 16))
  const cols = Math.floor(w / T)
  const rows = Math.floor(h / T)
  const cells: { x: number; y: number; v: number }[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0
      let sum2 = 0
      let n = 0
      for (let y = 0; y < T; y += 4) {
        let i = ((r * T + y) * w + c * T) * 4 + 1
        for (let x = 0; x < T; x += 4, i += 16) {
          const g = data[i]
          sum += g
          sum2 += g * g
          n++
        }
      }
      const mean = sum / n
      cells.push({ x: c * T, y: r * T, v: sum2 / n - mean * mean })
    }
  }
  if (cells.length === 0) return src

  // dos recortes con mucho detalle y dos de detalle medio, para cubrir tanto lo difícil como lo típico
  cells.sort((a, b) => b.v - a.v)
  const pick = new Set<number>([0, Math.min(1, cells.length - 1)])
  const mid = Math.floor(cells.length / 2)
  pick.add(Math.min(mid, cells.length - 1))
  pick.add(Math.min(mid + 1, cells.length - 1))
  const chosen = [...pick].map((i) => cells[i])

  const mw = Math.min(chosen.length, 2) * T
  const mh = Math.ceil(chosen.length / 2) * T
  const out = new Uint8ClampedArray(mw * mh * 4)
  chosen.forEach((cell, k) => {
    const ox = (k % 2) * T
    const oy = Math.floor(k / 2) * T
    for (let y = 0; y < T; y++) {
      const from = ((cell.y + y) * w + cell.x) * 4
      out.set(data.subarray(from, from + T * 4), ((oy + y) * mw + ox) * 4)
    }
  })
  return new ImageData(out, mw, mh)
}

/**
 * busca la calidad más baja que sigue superando la similitud exigida. como la similitud sube de
 * forma casi lineal con la calidad, se interpola entre un punto que pasa y uno que falla en lugar
 * de partir siempre por la mitad, y así suelen bastar tres o cuatro pruebas.
 */
export async function searchQuality(
  probe: (q: number) => Promise<number>,
  target: number,
  lo: number,
  hi: number,
  start: number,
  maxIter: number,
): Promise<number | null> {
  const seen = new Map<number, number>()
  let pass: number | null = null
  let fail: number | null = null
  let q = Math.min(hi, Math.max(lo, Math.round(start)))
  let streak = 0

  for (let i = 0; i < maxIter; i++) {
    const s = await probe(q)
    seen.set(q, s)
    if (s >= target) pass = pass === null ? q : Math.min(pass, q)
    else fail = fail === null ? q : Math.max(fail, q)

    if (pass !== null && fail !== null) {
      if (pass - fail <= 1) break
      const sf = seen.get(fail)!
      const sp = seen.get(pass)!
      const guess = sp > sf ? fail + ((target - sf) / (sp - sf)) * (pass - fail) : (fail + pass) / 2
      q = Math.min(pass - 1, Math.max(fail + 1, Math.round(guess)))
    } else if (pass !== null) {
      if (pass <= lo) break
      // mientras todo pase se baja con pasos cada vez mayores, para no gastar las pruebas de a poquito
      q = Math.max(lo, pass - 6 * 2 ** streak++)
    } else {
      if (fail! >= hi) break
      q = Math.min(hi, fail! + 6 * 2 ** streak++)
    }
  }
  return pass
}

/** estima la calidad con que se guardó un jpg a partir de su tabla de cuantización */
function estimateJpegQuality(b: Uint8Array): number | null {
  const base = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87,
    80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95,
    98, 112, 100, 103, 99,
  ]
  const baseSum = base.reduce((a, v) => a + v, 0)
  let i = 2
  while (i + 4 < b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    if (marker === 0xda) break
    const len = (b[i + 2] << 8) | b[i + 3]
    if (marker === 0xdb) {
      const precision = b[i + 4] >> 4
      if (precision === 0 && len >= 67) {
        let sum = 0
        for (let k = 0; k < 64; k++) sum += b[i + 5 + k]
        const scale = (sum / baseSum) * 100
        const q = scale <= 100 ? (200 - scale) / 2 : 5000 / scale
        return Math.max(1, Math.min(100, Math.round(q)))
      }
    }
    i += 2 + len
  }
  return null
}

/** codifica a una calidad dada y mide qué tanto se parece al original */
async function measure(src: ImageData, mime: string, enc: Encoder, quality: number): Promise<Candidate> {
  const bytes = await enc(src, quality)
  return { bytes, quality, score: similarity(src, await decodeBytes(bytes, mime)) }
}

/** búsqueda sobre el mosaico y verificación final sobre la imagen entera */
async function encodeToTarget(
  src: ImageData,
  mime: string,
  enc: Encoder,
  target: number,
  range: { lo: number; hi: number; start: number; iters: number },
): Promise<Candidate | null> {
  const mosaic = buildMosaic(src)
  // en imágenes pequeñas el mosaico es la imagen entera, así que lo medido en la búsqueda ya vale
  const whole = mosaic === src
  const tried = new Map<number, Candidate>()
  const probe = async (q: number) => {
    const cand = await measure(mosaic, mime, enc, q)
    if (whole) tried.set(q, cand)
    return cand.score
  }
  let q = await searchQuality(probe, target, range.lo, range.hi, range.start, range.iters)
  if (q === null) return null

  // la imagen completa manda, por eso si el mosaico fue demasiado optimista se sube la calidad de a poco
  for (let attempt = 0; attempt < 3; attempt++) {
    const cand = tried.get(q) ?? (await measure(src, mime, enc, q))
    if (cand.score >= target - 0.002) return cand
    if (q >= range.hi) return null
    q = Math.min(range.hi, q + 2)
  }
  return null
}

// ---------------------------------------------------------------------------------------
// metadatos de los jpg, que se copian del original cuando el usuario pide conservar el exif y el perfil de color

function extractJpegMeta(b: Uint8Array): Uint8Array[] {
  const segs: Uint8Array[] = []
  let i = 2
  while (i + 4 < b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    if (marker === 0xda) break
    const len = (b[i + 2] << 8) | b[i + 3]
    if (marker === 0xe1 || marker === 0xe2) segs.push(b.subarray(i, i + 2 + len))
    i += 2 + len
  }
  return segs
}

/** orientación guardada en el exif de un segmento APP1 (1 si no hay o no se puede leer) */
export function exifOrientation(seg: Uint8Array): number {
  const t = 10
  if (seg.length < t + 8 || ascii(seg, 4, 4) !== 'Exif') return 1
  const little = seg[t] === 0x49
  const dv = new DataView(seg.buffer, seg.byteOffset, seg.byteLength)
  const ifd = t + dv.getUint32(t + 4, little)
  if (ifd + 2 > seg.length) return 1
  const n = dv.getUint16(ifd, little)
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12
    if (e + 12 > seg.length) break
    if (dv.getUint16(e, little) === 0x0112) return dv.getUint16(e + 8, little)
  }
  return 1
}

/**
 * quita de un jpg el exif, los datos de iptc y los comentarios sin recomprimir (los píxeles
 * quedan idénticos). si la foto depende de la orientación del exif para verse derecha no se
 * toca porque quitarla la giraría, y en ese caso devuelve null.
 */
export function stripJpegMetaLossless(b: Uint8Array): Uint8Array | null {
  const parts: Uint8Array[] = [b.subarray(0, 2)]
  let i = 2
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    if (marker === 0xda) break
    const len = (b[i + 2] << 8) | b[i + 3]
    const seg = b.subarray(i, i + 2 + len)
    if (marker === 0xe1) {
      if (exifOrientation(seg) !== 1) return null
    } else if (marker !== 0xed && marker !== 0xfe) {
      parts.push(seg)
    }
    i += 2 + len
  }
  if (i >= b.length) return null
  parts.push(b.subarray(i))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

function stripWhenKept(original: Uint8Array, r: Omit<Ok, 'id'>): Omit<Ok, 'id'> {
  if (r.bytes !== null) return r
  const stripped = stripJpegMetaLossless(original)
  if (!stripped || stripped.length >= original.length) return r
  return { ...r, bytes: toArrayBuffer(stripped), outSize: stripped.length, note: undefined }
}

function injectJpegMeta(out: Uint8Array, meta: Uint8Array[]): Uint8Array {
  if (meta.length === 0) return out
  let at = 2
  if (out[2] === 0xff && out[3] === 0xe0) at = 4 + ((out[4] << 8) | out[5])
  const extra = meta.reduce((n, m) => n + m.length, 0)
  const merged = new Uint8Array(out.length + extra)
  merged.set(out.subarray(0, at), 0)
  let p = at
  for (const m of meta) {
    merged.set(m, p)
    p += m.length
  }
  merged.set(out.subarray(at), p)
  return merged
}

// ---------------------------------------------------------------------------------------
// imágenes de píxeles, que incluyen jpg, png, webp, avif y los formatos que se convierten

/** quita de un png los bloques que guardan texto, fecha y datos exif (la ubicación suele ir ahí) */
function stripPngChunks(b: Uint8Array): Uint8Array {
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const parts: Uint8Array[] = [b.subarray(0, 8)]
  let i = 8
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i)
    const end = i + 12 + len
    if (end > b.length) return b
    if (!drop.has(ascii(b, i + 4, 4))) parts.push(b.subarray(i, end))
    i = end
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/**
 * reduce un png a una paleta de hasta 256 colores y lo da por bueno solo si el resultado se
 * parece lo suficiente al original. devuelve null si no conviene o si la imagen es enorme.
 */
async function quantizePng(bytes: Uint8Array, dims: Dimensions | null, s: Settings): Promise<Uint8Array | null> {
  if (!dims || dims.width * dims.height > 16_000_000) return null
  const src = await decodeBitmap(bytes, 'image/png', { maxSide: 0, flatten: false, keepOrientation: false })
  // una paleta se juzga con un umbral propio, ya que es la reducción que hacen todos los compresores de png
  const target = s.mode === 'max' ? 0.86 : 0.9
  const UPNG = (await import('upng-js')).default
  const png = new Uint8Array(UPNG.encode([src.data.buffer as ArrayBuffer], src.width, src.height, s.mode === 'max' ? 128 : 256))
  if (similarity(src, await decodeBytes(png, 'image/png')) < target) return null
  return optimisePng(toArrayBuffer(png), s)
}

/** optimiza un png sin tocar píxeles, y los modos más fuertes prueban más combinaciones */
export async function optimisePng(buf: ArrayBuffer, s: Settings): Promise<Uint8Array> {
  const { optimise } = await import('@jsquash/oxipng')
  const level = s.mode === 'max' ? 5 : s.mode === 'recommended' ? 3 : 2
  return new Uint8Array(await optimise(buf, { level, interlace: false, optimiseAlpha: true }))
}

/**
 * optimiza el png en un worker aparte para aprovechar otro núcleo. si no se puede crear el worker
 * o falla, se hace en este mismo hilo y el resultado no cambia.
 */
function optimisePngAside(buf: ArrayBuffer, s: Settings): Promise<Uint8Array> {
  const here = () => optimisePng(buf, s)
  if (typeof Worker === 'undefined' || (navigator.hardwareConcurrency || 1) < 4) return here()
  return new Promise<Uint8Array>((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./pngWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(here())
      return
    }
    worker.onmessage = (e: MessageEvent<ArrayBuffer | { failed: true }>) => {
      worker.terminate()
      resolve(e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : here())
    }
    const fallback = () => {
      worker.terminate()
      resolve(here())
    }
    worker.onerror = fallback
    worker.onmessageerror = fallback
    worker.postMessage({ buf: buf.slice(0), settings: s }, [])
  })
}

async function compressRaster(
  bytes: Uint8Array,
  kind: ImageKind,
  dims: Dimensions | null,
  s: Settings,
): Promise<Omit<Ok, 'id'>> {
  const out = targetOutput(kind, s.output)
  const resizing = s.maxSide > 0 && dims !== null && Math.max(dims.width, dims.height) > s.maxSide
  const converted = out !== kind

  // un png que sigue siendo png sin cambiar de tamaño se optimiza sin tocar un solo píxel
  if (kind === 'png' && out === 'png' && !resizing) {
    const stripped = toArrayBuffer(stripPngChunks(bytes))
    // antes las dos pasadas iban una tras otra, y se deja a mano por si hay que volver a ese orden
    // const lossless = await optimisePng(stripped, s)
    // la pasada sin pérdida corre en un worker auxiliar mientras aquí se prepara la paleta, y el resultado es el mismo
    const losslessJob = optimisePngAside(stripped, s)
    // salvo en calidad alta, un png con muchos colores se reduce a una paleta si no se nota la diferencia
    // si la paleta falla por cualquier motivo, igual se entrega la versión sin pérdida
    const reduced = s.mode === 'high' ? null : await quantizePng(bytes, dims, s).catch(() => null)
    const lossless = await losslessJob
    const best = reduced && reduced.length < lossless.length ? reduced : lossless
    return finish(bytes, kind, 'png', best, dims, { converted: false })
  }

  const keepMeta = s.keepMetadata && kind === 'jpeg' && out === 'jpeg'
  const src = await decodeBitmap(bytes, KIND_MIME[kind], {
    maxSide: s.maxSide,
    flatten: out === 'jpeg',
    keepOrientation: keepMeta,
  })
  const size = { width: src.width, height: src.height }

  if (out === 'png') {
    const { encode } = await import('@jsquash/png')
    return finish(bytes, kind, 'png', await optimisePng(await encode(src), s), size, { converted, resized: resizing })
  }

  const custom = s.mode === 'custom'
  const target = custom ? 0 : TARGET_SCORE[s.mode as Exclude<typeof s.mode, 'custom'>]

  if (out === 'jpeg') {
    const { encode } = await import('@jsquash/jpeg')
    const enc: Encoder = async (img, q) =>
      new Uint8Array(
        await encode(img, {
          quality: q,
          progressive: true,
          optimize_coding: true,
          auto_subsample: false,
          chroma_subsample: 2,
        }),
      )
    const meta = keepMeta ? extractJpegMeta(bytes) : []
    // si no se logra reducir, igual se entrega sin los datos ocultos cuando eso se puede hacer sin recomprimir
    const tidy = (r: Omit<Ok, 'id'>) => (keepMeta || kind !== 'jpeg' ? r : stripWhenKept(bytes, r))
    // si ya era un jpg se parte de su propia calidad estimada, que casi siempre queda cerca
    const guess = (kind === 'jpeg' ? estimateJpegQuality(bytes) : null) ?? 85
    const cand = custom
      ? await measure(src, 'image/jpeg', enc, s.customQuality)
      : await encodeToTarget(src, 'image/jpeg', enc, target, {
          // salvo en máxima compresión, no se baja de una calidad que ya deja bloques en zonas lisas
          lo: s.mode === 'max' ? 40 : 55,
          hi: 98,
          start: Math.min(95, Math.max(60, guess - 2)),
          iters: 6,
        })
    if (!cand) return tidy(keep(bytes, kind, size, 'alreadyOptimal'))
    return tidy(
      finish(bytes, kind, 'jpeg', injectJpegMeta(cand.bytes, meta), size, {
        converted,
        resized: resizing,
        cand,
      }),
    )
  }

  if (out === 'webp') {
    const { encode } = await import('@jsquash/webp')
    // un webp sin pérdida se vuelve a comprimir sin pérdida, para no degradarlo
    if (kind === 'webp' && isLosslessWebp(bytes) && !resizing) {
      const res = new Uint8Array(await encode(src, { lossless: 1, method: 5, exact: 0 }))
      return finish(bytes, kind, 'webp', res, size, { converted: false })
    }
    const enc: Encoder = async (img, q) => new Uint8Array(await encode(img, { quality: q, method: 4 }))
    const cand = custom
      ? await measure(src, 'image/webp', enc, s.customQuality)
      : await encodeToTarget(src, 'image/webp', enc, target, { lo: s.mode === 'max' ? 40 : 55, hi: 98, start: 82, iters: 6 })
    if (!cand) return keep(bytes, kind, size, 'alreadyOptimal')
    return finish(bytes, kind, 'webp', cand.bytes, size, { converted, resized: resizing, cand })
  }

  // avif codifica despacio, así que la búsqueda tiene menos vueltas
  const { encode } = await import('@jsquash/avif')
  const enc: Encoder = async (img, q) => new Uint8Array(await encode(img, { quality: q, speed: 7 }))
  const cand = custom
    ? await measure(src, 'image/avif', enc, s.customQuality)
    : await encodeToTarget(src, 'image/avif', enc, target, { lo: 30, hi: 90, start: 60, iters: 5 })
  if (!cand) return keep(bytes, kind, size, 'alreadyOptimal')
  return finish(bytes, kind, 'avif', cand.bytes, size, { converted, resized: resizing, cand })
}

function finish(
  original: Uint8Array,
  inKind: ImageKind,
  outKind: ImageKind,
  result: Uint8Array,
  dims: Dimensions | null,
  info: { converted: boolean; resized?: boolean; cand?: Candidate },
): Omit<Ok, 'id'> {
  const width = dims?.width ?? 0
  const height = dims?.height ?? 0
  // si no gana peso se deja el original, salvo que se haya pedido cambiar el tamaño
  if (result.length >= original.length && !info.resized) {
    return keep(original, inKind, { width, height }, 'alreadyOptimal')
  }
  return {
    ok: true,
    bytes: toArrayBuffer(result),
    inKind,
    outKind,
    width,
    height,
    originalSize: original.length,
    outSize: result.length,
    note: info.resized ? 'resized' : info.converted ? 'converted' : undefined,
    score: info.cand?.score,
    quality: info.cand?.quality,
  }
}

// ---------------------------------------------------------------------------------------
// los svg se optimizan como texto y de paso se limpian de todo lo que pueda ejecutar código

async function compressSvg(bytes: Uint8Array, s: Settings): Promise<Omit<Ok, 'id'>> {
  const { optimize } = await import('svgo/browser')
  const text = new TextDecoder('utf-8').decode(bytes)

  const sanitize = {
    name: 'squeezoSanitize',
    fn: () => ({
      element: {
        enter(node: any, parent: any) {
          if (node.name === 'foreignObject' || node.name === 'script') {
            parent.children = parent.children.filter((c: unknown) => c !== node)
            return
          }
          // las imágenes remotas avisan a un tercero cada vez que se abre el archivo
          if (node.name === 'image' || node.name === 'use' || node.name === 'feImage') {
            for (const k of ['href', 'xlink:href']) {
              if (/^\s*(https?:)?\/\//i.test(String(node.attributes[k] ?? ''))) delete node.attributes[k]
            }
          }
          for (const attr of Object.keys(node.attributes)) {
            const val = String(node.attributes[attr]).trim().toLowerCase()
            if (attr.toLowerCase().startsWith('on') || val.startsWith('javascript:')) {
              delete node.attributes[attr]
            }
          }
        },
      },
    }),
  }

  let res
  try {
    res = optimize(text, {
      multipass: true,
      floatPrecision: s.mode === 'max' ? 2 : 3,
      plugins: [
        'preset-default',
        'removeScripts',
        sanitize as any,
      ],
    })
  } catch {
    throw new JobError('decode', 'svg')
  }
  const out = new TextEncoder().encode(res.data)
  // si el original traía scripts no se devuelve tal cual aunque la versión limpia no pese menos
  const risky = /<script|\son\w+\s*=|javascript:|<foreignObject/i.test(text)
  if (out.length >= bytes.length && !risky) return keep(bytes, 'svg', null, 'alreadyOptimal')
  return {
    ok: true,
    bytes: toArrayBuffer(out),
    inKind: 'svg',
    outKind: 'svg',
    width: 0,
    height: 0,
    originalSize: bytes.length,
    outSize: out.length,
  }
}
