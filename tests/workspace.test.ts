import { beforeEach, describe, expect, it, vi } from 'vitest'

// el almacén asigna una referencia a window en desarrollo, que no existe en el entorno de pruebas
vi.stubGlobal('window', {})
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { useWorkspace } = await import('../src/store/workspace')

const item = (id: string, path: string, status = 'pending') =>
  ({ id, path, name: path.split('/').pop(), size: 100, kind: 'jpeg', mtime: 0, selected: true, status, source: {} }) as never

function load(entries: [string, string, string?][], skipped = 0) {
  const items: Record<string, never> = {}
  for (const [id, path, status] of entries) items[id] = item(id, path, status)
  useWorkspace.setState({
    items,
    order: entries.map((e) => e[0]),
    skipped: Array.from({ length: skipped }, () => ({}) as never),
    phase: 'ready',
  })
}

describe('removeItems', () => {
  beforeEach(() => load([['a', 'a.jpg'], ['b', 'b.jpg'], ['c', 'c.jpg']]))

  it('quita las imágenes pedidas y respeta el orden de las demás', () => {
    useWorkspace.getState().removeItems(['b'])
    expect(useWorkspace.getState().order).toEqual(['a', 'c'])
    expect(useWorkspace.getState().items.b).toBeUndefined()
  })

  it('no toca lo que se está comprimiendo en ese momento', () => {
    load([['a', 'a.jpg', 'processing'], ['b', 'b.jpg']])
    useWorkspace.getState().removeItems(['a', 'b'])
    expect(useWorkspace.getState().order).toEqual(['a'])
  })

  it('vuelve a la portada al quedarse sin nada', () => {
    useWorkspace.getState().removeItems(['a', 'b', 'c'])
    expect(useWorkspace.getState().phase).toBe('empty')
  })

  it('conserva la vista si todavía hay archivos omitidos que mostrar', () => {
    load([['a', 'a.jpg']], 2)
    useWorkspace.getState().removeItems(['a'])
    expect(useWorkspace.getState().phase).toBe('ready')
  })
})

describe('moveItem', () => {
  beforeEach(() => load([['a', 'a.jpg'], ['b', 'b.jpg'], ['c', 'c.jpg'], ['d', 'd.jpg']]))

  it('al bajar una imagen queda justo después de la de destino', () => {
    useWorkspace.getState().moveItem('a', 'c')
    expect(useWorkspace.getState().order).toEqual(['b', 'c', 'a', 'd'])
  })

  it('al subir una imagen queda justo antes de la de destino', () => {
    useWorkspace.getState().moveItem('d', 'b')
    expect(useWorkspace.getState().order).toEqual(['a', 'd', 'b', 'c'])
  })

  it('ignora destinos que no existen o que son la misma imagen', () => {
    useWorkspace.getState().moveItem('a', 'a')
    useWorkspace.getState().moveItem('a', 'zzz')
    expect(useWorkspace.getState().order).toEqual(['a', 'b', 'c', 'd'])
  })
})
