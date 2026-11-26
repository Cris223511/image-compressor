// lectura de la fuente de una imagen (archivo suelto o entrada de zip) y utilidades que
// comparten el motor, los gif y la interfaz, para que la regla viva en un solo sitio.

import { MAX_ENTRY_BYTES } from '../../config/limits'
import { KIND_MIME, sniffKind } from '../formats'
import { ZipError, extractZipEntry } from '../zip/reader'
import type { ErrorCode, JobResult, Source } from './types'

export class JobError extends Error {
  constructor(
    public code: ErrorCode,
    public detail?: string,
  ) {
    super(code)
  }
}

export async function readSource(s: Source): Promise<Uint8Array> {
  if (s.kind === 'file') {
    if (s.file.size > MAX_ENTRY_BYTES) throw new JobError('tooBig')
    return new Uint8Array(await s.file.arrayBuffer())
  }
  return extractZipEntry(s.file, s.entry)
}

/** el original como Blob con su tipo real, para mostrarlo, compararlo o descargarlo */
export async function sourceBlob(s: Source): Promise<Blob> {
  if (s.kind === 'file') return s.file
  const bytes = await extractZipEntry(s.file, s.entry)
  const kind = sniffKind(bytes)
  return new Blob([bytes as BlobPart], { type: kind ? KIND_MIME[kind] : 'application/octet-stream' })
}

/** traduce cualquier excepción del proceso a un resultado de error del trabajo */
export function failure(id: string, e: unknown): Extract<JobResult, { ok: false }> {
  if (e instanceof JobError) return { id, ok: false, error: e.code, detail: e.detail }
  if (e instanceof ZipError) return { id, ok: false, error: 'zip', detail: e.code }
  return { id, ok: false, error: 'decode', detail: e instanceof Error ? e.message : String(e) }
}

/** el buffer de una vista; solo se copia cuando la vista no abarca el buffer completo */
export function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  if (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength) return u8.buffer as ArrayBuffer
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}
