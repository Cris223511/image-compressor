import { useCallback, useRef, type ReactNode } from 'react'
import { incomingFromInput } from '../lib/intake'
import { useWorkspace } from '../store/workspace'

const IMAGE_ACCEPT = 'image/*,.heic,.heif,.avif,.tif,.tiff,.svg,.ico,.bmp,.zip'

/**
 * entradas de archivo ocultas y las funciones para abrirlas. las usan tanto la portada
 * como la barra de trabajo, así que viven en un solo sitio.
 */
export function usePickers(): {
  inputs: ReactNode
  openFiles: () => void
  openFolder: () => void
  openZip: () => void
  loadSample: () => Promise<void>
} {
  const files = useRef<HTMLInputElement>(null)
  const folder = useRef<HTMLInputElement>(null)
  const zip = useRef<HTMLInputElement>(null)
  const add = useWorkspace((s) => s.addIncoming)

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files
      if (list?.length) add(incomingFromInput(list))
      // se limpia para poder elegir de nuevo el mismo archivo
      e.target.value = ''
    },
    [add],
  )

  const inputs = (
    <>
      <input ref={files} type="file" multiple accept={IMAGE_ACCEPT} className="hidden" onChange={onPick} tabIndex={-1} />
      <input
        ref={folder}
        type="file"
        multiple
        className="hidden"
        onChange={onPick}
        tabIndex={-1}
        // webkitdirectory no está en los tipos de react, pero lo entienden todos los navegadores
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />
      <input ref={zip} type="file" accept=".zip,application/zip" className="hidden" onChange={onPick} tabIndex={-1} />
    </>
  )

  const loadSample = useCallback(async () => {
    const res = await fetch('/sample/foto-de-ejemplo.jpg')
    const blob = await res.blob()
    const file = new File([blob], 'foto-de-ejemplo.jpg', { type: 'image/jpeg' })
    await add([{ file, path: file.name }])
  }, [add])

  return {
    inputs,
    openFiles: () => files.current?.click(),
    openFolder: () => folder.current?.click(),
    openZip: () => zip.current?.click(),
    loadSample,
  }
}
