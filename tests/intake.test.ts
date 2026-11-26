import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { ingest, sortByModified } from '../src/lib/intake'
import { MAX_IMAGES } from '../src/config/limits'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1])
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0])

const file = (data: Uint8Array | string, name: string) => new File([typeof data === 'string' ? data : (data as BlobPart)], name)
const run = (incoming: { file: File; path: string }[]) => ingest(incoming, new Set())

describe('ingest', () => {
  it('acepta imágenes por su contenido y descarta lo demás con su categoría', async () => {
    const res = await run([
      { file: file(JPG, 'a.jpg'), path: 'a.jpg' },
      { file: file('esto es texto', 'falsa.jpg'), path: 'falsa.jpg' },
      { file: file(new Uint8Array([0x4d, 0x5a, 0x90, 0]), 'virus.exe'), path: 'virus.exe' },
      { file: file('hola', 'notas.txt'), path: 'notas.txt' },
      { file: file('<svg xmlns="http://www.w3.org/2000/svg"/>', 'logo.svg'), path: 'logo.svg' },
    ])
    expect(res.items.map((i) => i.path).sort()).toEqual(['a.jpg', 'logo.svg'])
    const cats = Object.fromEntries(res.skipped.map((s) => [s.path, s.category]))
    expect(cats).toEqual({ 'falsa.jpg': 'invalid', 'virus.exe': 'executable', 'notas.txt': 'document' })
  })

  it('una imagen con otra extensión se acepta por lo que realmente es', async () => {
    const res = await run([{ file: file(PNG, 'foto.dat'), path: 'foto.dat' }])
    expect(res.items[0].kind).toBe('png')
  })

  it('nombres repetidos no se pisan', async () => {
    const res = await run([
      { file: file(JPG, 'a.jpg'), path: 'a.jpg' },
      { file: file(JPG, 'a.jpg'), path: 'a.jpg' },
    ])
    expect(res.items.map((i) => i.path)).toEqual(['a.jpg', 'a (2).jpg'])
  })

  it('un zip se abre como carpeta y se omite lo que no es imagen o es peligroso', async () => {
    const zip = zipSync({
      'viaje/playa/a.png': PNG,
      'viaje/b.jpg': JPG,
      'viaje/clip.mp4': strToU8('video'),
      'viaje/setup.exe': strToU8('MZ'),
      '../../evil.jpg': JPG,
      '__MACOSX/viaje/._b.jpg': strToU8('basura'),
    })
    const res = await run([{ file: file(zip, 'fotos.zip'), path: 'fotos.zip' }])
    expect(res.items.map((i) => i.path).sort()).toEqual(['fotos/viaje/b.jpg', 'fotos/viaje/playa/a.png'])
    const cats = res.skipped.map((s) => s.category).sort()
    expect(cats).toEqual(['executable', 'unsafe', 'video'])
  })

  it('un zip con más imágenes que el tope toma las primeras y avisa del resto', async () => {
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < MAX_IMAGES + 5; i++) files[`lote/img_${String(i).padStart(4, '0')}.png`] = PNG
    const res = await run([{ file: file(zipSync(files, { level: 0 }), 'muchas.zip'), path: 'muchas.zip' }])
    expect(res.items).toHaveLength(MAX_IMAGES)
    expect(res.skipped.filter((s) => s.category === 'limit')).toHaveLength(5)
  })

  it('un zip dañado se informa en vez de romper', async () => {
    const res = await run([{ file: file('PK\u0003\u0004 pero roto de sobra para no ser zip', 'roto.zip'), path: 'roto.zip' }])
    expect(res.items).toHaveLength(0)
    expect(res.skipped[0].category).toBe('invalid')
  })
})

describe('sortByModified', () => {
  const at = (name: string, mtime: number) => ({ name, mtime })

  it('ordena de la fecha más antigua a la más reciente', () => {
    const sorted = sortByModified([at('c', 300), at('a', 100), at('b', 200)])
    expect(sorted.map((x) => x.name)).toEqual(['a', 'b', 'c'])
  })

  it('las de la misma fecha conservan el orden en que llegaron', () => {
    const sorted = sortByModified([at('z', 100), at('y', 100), at('x', 100)])
    expect(sorted.map((x) => x.name)).toEqual(['z', 'y', 'x'])
  })

  it('las que no traen fecha van al final y no se mezclan', () => {
    const sorted = sortByModified([at('sin1', 0), at('nueva', 500), at('sin2', 0), at('vieja', 10)])
    expect(sorted.map((x) => x.name)).toEqual(['vieja', 'nueva', 'sin1', 'sin2'])
  })

  it('no modifica la lista original', () => {
    const original = [at('b', 2), at('a', 1)]
    sortByModified(original)
    expect(original.map((x) => x.name)).toEqual(['b', 'a'])
  })
})
