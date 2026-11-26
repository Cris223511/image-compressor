// escritor de zips en streaming. las imágenes ya vienen comprimidas, así que se guardan sin
// recomprimir (más rápido y sin gastar memoria). si el navegador deja elegir dónde guardar,
// los trozos se escriben directo a disco y el tamaño total solo lo limita el disco.

import { Zip, ZipPassThrough } from 'fflate'

export interface ZipFileInput {
  path: string
  /** se pide al momento de escribir, así no se cargan todas las imágenes a la vez */
  blob: () => Promise<Blob>
}

interface FsWritable {
  write(chunk: Uint8Array): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}

type PickerWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<{ createWritable(): Promise<FsWritable> }>
}

/** abre el selector de guardado. se llama directo desde el clic para no perder el permiso */
export async function openDiskTarget(suggestedName: string): Promise<FsWritable | null> {
  const w = window as PickerWindow
  if (!w.showSaveFilePicker) return null
  const handle = await w.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }],
  })
  return handle.createWritable()
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function writeZip(
  files: ZipFileInput[],
  name: string,
  disk: FsWritable | null,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const memory: Uint8Array[] = []
  let chain: Promise<void> = Promise.resolve()
  let failure: unknown = null

  const zip = new Zip((err, chunk) => {
    if (err) {
      failure = err
      return
    }
    if (disk) chain = chain.then(() => disk.write(chunk))
    else memory.push(chunk)
  })

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const entry = new ZipPassThrough(f.path)
      zip.add(entry)
      entry.push(new Uint8Array(await (await f.blob()).arrayBuffer()), true)
      // se espera a que el disco vaya al ritmo para no acumular trozos en memoria
      if (disk) await chain
      if (failure) throw failure
      onProgress?.(i + 1, files.length)
    }
    zip.end()
    if (disk) {
      await chain
      await disk.close()
    } else {
      downloadBlob(new Blob(memory as BlobPart[], { type: 'application/zip' }), name)
    }
  } catch (e) {
    if (disk) await disk.abort().catch(() => undefined)
    throw e
  }
}
