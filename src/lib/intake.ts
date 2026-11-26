// entrada de archivos por arrastrar y soltar (con carpetas), selector de archivos y selector de
// carpetas. todo termina como una lista plana de archivos con su ruta relativa.

import { MAX_IMAGES, MAX_SKIPPED } from '../config/limits'
import { categoryFromExt, isJunk, kindFromExt, sniffKind, type ImageKind, type SkipCategory } from './formats'
import { ZipError, readZipDirectory, safePath, type ZipEntry } from './zip/reader'
import type { Source } from './compress/types'

export interface Incoming {
  file: File
  path: string
}

export interface NewItem {
  /** fecha de modificación original en milisegundos, que se conserva al descargar */
  mtime: number
  path: string
  name: string
  size: number
  source: Source
  kind: ImageKind
}

export interface NewSkip {
  path: string
  size: number
  category: SkipCategory
}

export interface IntakeResult {
  items: NewItem[]
  skipped: NewSkip[]
}

/** tope de archivos que se recorren al soltar una carpeta, para no quedarse en un árbol gigante */
const MAX_WALK = 60_000

export type FsEntry = {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (ok: (f: File) => void, err: (e: unknown) => void) => void
  createReader?: () => { readEntries(ok: (e: FsEntry[]) => void, err: (e: unknown) => void): void }
}

/** debe llamarse de forma síncrona dentro del evento drop, antes de cualquier await */
export function entriesFromDataTransfer(dt: DataTransfer): { entries: FsEntry[]; files: File[] } {
  const entries: FsEntry[] = []
  const files: File[] = []
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file') continue
    const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.()
    if (entry) entries.push(entry)
    else {
      const f = item.getAsFile()
      if (f) files.push(f)
    }
  }
  if (!entries.length && !files.length) files.push(...Array.from(dt.files))
  return { entries, files }
}

export async function walkEntries(entries: FsEntry[], files: File[]): Promise<Incoming[]> {
  let count = 0

  // cada carpeta devuelve sus archivos en el orden en que el sistema los lista, y las lecturas pueden
  // ir en paralelo, pero el resultado se arma siempre en ese mismo orden
  async function walk(entry: FsEntry, prefix: string): Promise<Incoming[]> {
    if (count > MAX_WALK) return []
    if (entry.isFile && entry.file) {
      const file = await new Promise<File>((ok, err) => entry.file!(ok, err))
      count++
      return [{ file, path: prefix + file.name }]
    }
    if (entry.isDirectory && entry.createReader) {
      const reader = entry.createReader()
      const out: Incoming[] = []
      // readEntries devuelve de a lotes, así que se repite hasta que venga vacío
      for (;;) {
        const batch = await new Promise<FsEntry[]>((ok, err) => reader.readEntries(ok, err))
        if (!batch.length) break
        const parts = await Promise.all(batch.map((child) => walk(child, `${prefix}${entry.name}/`)))
        for (const part of parts) out.push(...part)
      }
      return out
    }
    return []
  }

  const out: Incoming[] = files.map((file) => ({ file, path: file.name }))
  for (const e of entries) out.push(...(await walk(e, '')))
  return out
}

export function incomingFromInput(list: FileList): Incoming[] {
  return Array.from(list).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))
}

async function head(file: File, n: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, n).arrayBuffer())
}

function isZipSignature(b: Uint8Array): boolean {
  return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6)
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** convierte lo recibido en imágenes aceptadas y archivos omitidos, sin procesar nada todavía */
export async function ingest(incoming: Incoming[], usedPaths: Set<string>): Promise<IntakeResult> {
  const items: NewItem[] = []
  const skipped: NewSkip[] = []
  let looseImages = 0

  const unique = (path: string): string => {
    if (!usedPaths.has(path)) {
      usedPaths.add(path)
      return path
    }
    const slash = path.lastIndexOf('/')
    const dot = path.lastIndexOf('.')
    const stem = dot > slash ? path.slice(0, dot) : path
    const ext = dot > slash ? path.slice(dot) : ''
    for (let n = 2; ; n++) {
      const candidate = `${stem} (${n})${ext}`
      if (!usedPaths.has(candidate)) {
        usedPaths.add(candidate)
        return candidate
      }
    }
  }

  // las cabeceras se leen por lotes en paralelo, porque leerlas de a una espera mil veces al disco
  const heads: Uint8Array[] = []
  for (let i = 0; i < incoming.length; i += 24) {
    const batch = incoming.slice(i, i + 24)
    // un svg es texto y su etiqueta puede venir tras comentarios, así que se lee un poco más
    heads.push(...(await Promise.all(batch.map((x) => (isJunk(x.path) ? new Uint8Array() : head(x.file, 2048))))))
  }

  for (const [n, { file, path: rawPath }] of incoming.entries()) {
    if (isJunk(rawPath)) continue
    // la ruta de un archivo suelto o de una carpeta también puede traer partes peligrosas
    const path = safePath(rawPath)
    if (path === null) {
      skipped.push({ path: rawPath, size: file.size, category: 'unsafe' })
      continue
    }
    const start = heads[n]

    if (isZipSignature(start) && /\.zip$/i.test(file.name)) {
      await ingestZip(file, path, items, skipped, unique)
      continue
    }

    const kind = sniffKind(start)
    if (kind) {
      if (looseImages >= MAX_IMAGES) {
        skipped.push({ path, size: file.size, category: 'limit' })
        continue
      }
      looseImages++
      const finalPath = unique(path)
      items.push({ path: finalPath, name: baseName(finalPath), size: file.size, source: { kind: 'file', file }, kind, mtime: file.lastModified })
    } else if (kindFromExt(file.name)) {
      // decía ser una imagen pero por dentro no lo es
      skipped.push({ path, size: file.size, category: 'invalid' })
    } else if (isZipSignature(start)) {
      skipped.push({ path, size: file.size, category: 'archive' })
    } else {
      skipped.push({ path, size: file.size, category: categoryFromExt(file.name) })
    }
  }

  return { items, skipped: skipped.slice(0, MAX_SKIPPED) }
}

async function ingestZip(
  file: File,
  path: string,
  items: NewItem[],
  skipped: NewSkip[],
  unique: (p: string) => string,
) {
  let entries: ZipEntry[]
  try {
    entries = await readZipDirectory(file)
  } catch (e) {
    const code = e instanceof ZipError ? e.code : 'corrupt'
    skipped.push({ path, size: file.size, category: code === 'tooMany' ? 'limit' : 'invalid' })
    return
  }

  const root = path.replace(/\.zip$/i, '')
  let images = 0
  for (const entry of entries) {
    if (entry.isDir || isJunk(entry.path)) continue
    const full = `${root}/${entry.path}`

    if (entry.problem) {
      skipped.push({ path: full, size: entry.size, category: entry.problem })
      continue
    }
    const kind = kindFromExt(entry.path)
    if (!kind) {
      skipped.push({ path: full, size: entry.size, category: categoryFromExt(entry.path) })
      continue
    }
    if (images >= MAX_IMAGES) {
      skipped.push({ path: full, size: entry.size, category: 'limit' })
      continue
    }
    images++
    const finalPath = unique(full)
    items.push({
      path: finalPath,
      name: baseName(finalPath),
      size: entry.size,
      source: { kind: 'zip', file, entry },
      kind,
      mtime: entry.mtime,
    })
  }
}
