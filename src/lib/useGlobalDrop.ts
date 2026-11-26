import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { entriesFromDataTransfer, walkEntries } from './intake'
import { useWorkspace } from '../store/workspace'

/** convierte toda la ventana en zona de suelta y avisa cuando se está arrastrando algo */
export function useGlobalDrop(): boolean {
  const [dragging, setDragging] = useState(false)
  const home = useLocation().pathname === '/'

  useEffect(() => {
    let depth = 0
    // una imagen de la propia página que se arrastra también declara «Files», así que se distingue por su origen
    let internal = false
    const start = () => (internal = true)
    const end = () => {
      internal = false
      depth = 0
      setDragging(false)
    }
    const hasFiles = (e: DragEvent) => !internal && Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      // fuera de la vista principal no se ofrece soltar archivos, solo se evita que el navegador los abra
      if (!home) return
      depth++
      setDragging(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      if (!home) return
      // las entradas de carpeta solo existen mientras dura el evento, se leen ya
      const { entries, files } = entriesFromDataTransfer(e.dataTransfer!)
      walkEntries(entries, files).then((incoming) => useWorkspace.getState().addIncoming(incoming))
    }

    window.addEventListener('dragstart', start)
    window.addEventListener('dragend', end)
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragstart', start)
      window.removeEventListener('dragend', end)
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [home])

  return dragging
}
