import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { ZipError, extractZipEntry, readZipDirectory, safePath } from '../src/lib/zip/reader'

const asFile = (data: Uint8Array, name = 'prueba.zip') => new File([data as BlobPart], name)

/** el desplazamiento del primer registro del directorio central que lleve ese nombre */
function centralOffset(zip: Uint8Array, name: string): number {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  for (let i = 0; i < zip.length - 46; i++) {
    if (dv.getUint32(i, true) !== 0x02014b50) continue
    const nameLen = dv.getUint16(i + 28, true)
    const found = new TextDecoder().decode(zip.subarray(i + 46, i + 46 + nameLen))
    if (found === name) return i
  }
  throw new Error('no encontrado')
}

describe('safePath', () => {
  it('normaliza rutas normales', () => {
    expect(safePath('fotos/a.jpg')).toBe('fotos/a.jpg')
    expect(safePath('fotos\\sub\\a.jpg')).toBe('fotos/sub/a.jpg')
    expect(safePath('./a.jpg')).toBe('a.jpg')
  })

  it('rechaza intentos de salir de la carpeta', () => {
    expect(safePath('../evil.jpg')).toBeNull()
    expect(safePath('fotos/../../evil.jpg')).toBeNull()
    expect(safePath('C:\\Windows\\a.jpg')).toBeNull()
    expect(safePath('a\0.jpg')).toBeNull()
    expect(safePath('')).toBeNull()
  })

  it('una ruta absoluta pierde su raíz en vez de escapar', () => {
    expect(safePath('/etc/passwd')).toBe('etc/passwd')
  })
})

describe('readZipDirectory', () => {
  const photo = new Uint8Array(4000).fill(7)

  it('lista las entradas con carpetas sin descomprimir nada', async () => {
    const zip = zipSync({ 'vacaciones/playa/a.jpg': photo, 'notas.txt': strToU8('hola') })
    const entries = await readZipDirectory(asFile(zip))
    const paths = entries.filter((e) => !e.isDir).map((e) => e.path).sort()
    expect(paths).toEqual(['notas.txt', 'vacaciones/playa/a.jpg'])
    expect(entries.every((e) => e.problem === null)).toBe(true)
  })

  it('marca como inseguras las rutas con ..', async () => {
    const zip = zipSync({ '../../evil.jpg': photo })
    const [entry] = await readZipDirectory(asFile(zip))
    expect(entry.problem).toBe('unsafe')
  })

  it('marca las entradas cifradas', async () => {
    const zip = zipSync({ 'secreto.jpg': photo })
    const at = centralOffset(zip, 'secreto.jpg')
    const dv = new DataView(zip.buffer)
    dv.setUint16(at + 8, dv.getUint16(at + 8, true) | 1, true)
    const [entry] = await readZipDirectory(asFile(zip))
    expect(entry.problem).toBe('encrypted')
  })

  it('rechaza lo que no es un zip', async () => {
    await expect(readZipDirectory(asFile(strToU8('esto no es un zip, pero es largo de sobra')))).rejects.toMatchObject({ code: 'notZip' })
    await expect(readZipDirectory(asFile(new Uint8Array(5)))).rejects.toBeInstanceOf(ZipError)
  })
})

describe('extractZipEntry', () => {
  it('devuelve el contenido exacto, comprimido o no', async () => {
    const data = new Uint8Array(5000).map((_, i) => i % 251)
    const zip = zipSync({ 'a.bin': [data, { level: 6 }], 'b.bin': [data, { level: 0 }] })
    const file = asFile(zip)
    const entries = await readZipDirectory(file)
    for (const e of entries) expect(await extractZipEntry(file, e)).toEqual(data)
  })

  it('corta una entrada que al abrirse pesa más de lo que declara', async () => {
    const zip = zipSync({ 'bomba.bin': [new Uint8Array(100_000), { level: 9 }] })
    // la cabecera miente: dice pesar mucho menos de lo real
    const at = centralOffset(zip, 'bomba.bin')
    new DataView(zip.buffer).setUint32(at + 24, 500, true)
    const file = asFile(zip)
    const [entry] = await readZipDirectory(file)
    await expect(extractZipEntry(file, entry)).rejects.toMatchObject({ code: 'bomb' })
  })
})
