import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { entriesFromDataTransfer, walkEntries } from './intake'
import { useWorkspace } from '../store/workspace'

/** convierte toda la ventana en zona de suelta y avisa cuando se está arrastrando algo */
export function useGlobalDrop(): boolean {
  const [dragging, setDragging] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
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
      // las entradas de carpeta solo existen mientras dura el evento, se leen ya
      const { entries, files } = entriesFromDataTransfer(e.dataTransfer!)
      navigate('/')
      walkEntries(entries, files).then((incoming) => useWorkspace.getState().addIncoming(incoming))
    }

    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [navigate])

  return dragging
}
