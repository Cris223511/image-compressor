// los gif se comprimen con gifsicle compilado a wasm. corre en el hilo principal porque
// gestiona su propio worker por dentro, por eso se hacen de uno en uno.

import { MAX_PIXELS } from '../../config/limits'
import { readDimensions, sniffKind } from '../formats'
import { JobError, failure, readSource, toArrayBuffer } from './source'
import type { JobRequest, JobResult, Settings } from './types'

let chain: Promise<unknown> = Promise.resolve()

interface GifOutcome {
  bytes: Uint8Array | null
  note?: 'alreadyOptimal' | 'resized'
}

/** mismo contrato que runJob, para que el pool trate a los gif como un trabajo más */
export async function runGifJob(req: JobRequest): Promise<JobResult> {
  try {
    const bytes = await readSource(req.source)
    if (sniffKind(bytes) !== 'gif') throw new JobError('notImage')
    const dims = readDimensions(bytes, 'gif')
    if (dims && dims.width * dims.height > MAX_PIXELS) throw new JobError('pixels')
    const out = await compressGif(bytes, req.settings)
    const base = {
      id: req.id,
      ok: true as const,
      inKind: 'gif' as const,
      outKind: 'gif' as const,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
      originalSize: bytes.length,
    }
    if (!out.bytes) return { ...base, bytes: null, outSize: bytes.length, note: 'alreadyOptimal' }
    return { ...base, bytes: toArrayBuffer(out.bytes), outSize: out.bytes.length, note: out.note }
  } catch (e) {
    // gifsicle falla con errores propios que no hace falta distinguir
    const known = failure(req.id, e)
    return known.error === 'decode' ? { ...known, detail: 'gif' } : known
  }
}

function compressGif(bytes: Uint8Array, s: Settings): Promise<GifOutcome> {
  const run = chain.then(() => withTimeout(doCompress(bytes, s), 120_000))
  chain = run.catch(() => undefined)
  return run
}

async function doCompress(bytes: Uint8Array, s: Settings): Promise<GifOutcome> {
  // sin pérdida solo reordena y optimiza cuadros, mientras que los demás modos reducen colores en saltos suaves
  const lossy = s.mode === 'high' ? 0 : s.mode === 'recommended' ? 20 : s.mode === 'max' ? 60 : Math.round((100 - s.customQuality) * 1.4)
  const flags = ['-O3', '--no-comments', '--no-names']
  if (lossy > 0) flags.push(`--lossy=${lossy}`)
  if (s.maxSide > 0) flags.push(`--resize-fit ${s.maxSide}x${s.maxSide}`)

  // se carga solo cuando aparece un gif, para no engordar la descarga inicial
  const { default: gifsicle } = await import('gifsicle-wasm-browser')
  const files = await gifsicle.run({
    input: [{ file: new Blob([bytes as BlobPart], { type: 'image/gif' }), name: '1.gif' }],
    command: [`${flags.join(' ')} 1.gif -o /out/out.gif`],
  })
  if (!files.length) return { bytes: null, note: 'alreadyOptimal' }
  const out = new Uint8Array(await files[0].arrayBuffer())
  if (out.length >= bytes.length && s.maxSide === 0) return { bytes: null, note: 'alreadyOptimal' }
  return { bytes: out, note: s.maxSide > 0 ? 'resized' : undefined }
}

/** gifsicle a veces no responde si algo lo bloquea, así que se corta para no dejar la cola colgada */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('gif timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}
