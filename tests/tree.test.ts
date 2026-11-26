import { describe, expect, it } from 'vitest'
import { buildTree, flatten, folderPaths } from '../src/lib/tree'

const entries = [
  { id: '1', path: 'fotos/img10.jpg' },
  { id: '2', path: 'fotos/img2.jpg' },
  { id: '3', path: 'fotos/playa/sol.jpg' },
  { id: '4', path: 'suelta.jpg' },
]

describe('árbol de carpetas', () => {
  it('pone las carpetas primero y ordena los números de forma natural', () => {
    const rows = flatten(buildTree(entries), new Set())
    const labels = rows.map((n) => (n.type === 'folder' ? `[${n.path}]` : n.id))
    expect(labels).toEqual(['[fotos]', '[fotos/playa]', '3', '2', '1', '4'])
  })

  it('cada carpeta conoce todas las imágenes que cuelgan de ella', () => {
    const [fotos] = buildTree(entries)
    expect(fotos.type).toBe('folder')
    if (fotos.type === 'folder') expect(fotos.ids.sort()).toEqual(['1', '2', '3'])
  })

  it('una carpeta cerrada esconde su contenido', () => {
    const rows = flatten(buildTree(entries), new Set(['fotos']))
    expect(rows.map((n) => (n.type === 'folder' ? n.path : n.id))).toEqual(['fotos', '4'])
  })

  it('lista las rutas de todas las carpetas', () => {
    expect(folderPaths(buildTree(entries))).toEqual(['fotos', 'fotos/playa'])
  })
})
