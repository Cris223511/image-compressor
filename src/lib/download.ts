// descargas: una imagen suelta o todo el resultado dentro de un zip con la misma estructura.

import { sourceBlob } from './compress/source'
import { downloadBlob, openDiskTarget, writeZip, type ZipFileInput } from './zip/writer'
import type { Item } from '../store/workspace'

/** el original de un elemento, sea un archivo suelto o una entrada de zip */
export const originalBlob = (item: Item): Promise<Blob> => sourceBlob(item.source)

export async function resultBlob(item: Item): Promise<Blob> {
  return item.result?.blob ?? (await originalBlob(item))
}

export function outputPath(item: Item): string {
  const name = item.result?.name ?? item.name
  const i = item.path.lastIndexOf('/')
  return i < 0 ? name : `${item.path.slice(0, i + 1)}${name}`
}

export async function downloadOne(item: Item) {
  downloadBlob(await resultBlob(item), item.result?.name ?? item.name)
}

export async function downloadAllZip(items: Item[], onProgress?: (done: number, total: number) => void) {
  const stamp = new Date().toISOString().slice(0, 10)
  const name = `squeezo-${stamp}.zip`
  // el selector de guardado debe abrirse primero, directo desde el clic del usuario
  let disk = null
  try {
    disk = await openDiskTarget(name)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
  }

  const files: ZipFileInput[] = []
  for (const it of items) files.push({ path: outputPath(it), mtime: it.mtime, blob: () => resultBlob(it) })
  await writeZip(files, name, disk, onProgress)
}
