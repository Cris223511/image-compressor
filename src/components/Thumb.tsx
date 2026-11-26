import { memo, useEffect, useRef, useState } from 'react'
import { FileImage } from 'lucide-react'
import { MAX_PIXELS, THUMB_MAX_BYTES } from '../config/limits'
import { sourceBlob } from '../lib/compress/source'
import { readDimensions, sniffKind } from '../lib/formats'
import type { Item } from '../store/workspace'

// miniaturas perezosas: se generan solo para las filas que se ven y se guardan en una caché
// pequeña. las de zips obligan a descomprimir la entrada, por eso se hacen de a pocas.

const SIZE = 72
const cache = new Map<string, ImageBitmap | 'fail'>()
const MAX_CACHE = 400

let active = 0
const waiting: (() => void)[] = []

function acquire(): Promise<void> {
  if (active < 3) {
    active++
    return Promise.resolve()
  }
  return new Promise((ok) => waiting.push(() => { active++; ok() }))
}

function release() {
  active--
  waiting.shift()?.()
}

async function makeThumb(item: Item): Promise<ImageBitmap | 'fail'> {
  try {
    if (item.source.kind === 'zip' && item.source.entry.size > THUMB_MAX_BYTES) return 'fail'
    const blob = await sourceBlob(item.source)
    // el tamaño se lee de la cabecera antes de decodificar: una imagen diminuta en disco puede pedir gigas
    const head = new Uint8Array(await blob.slice(0, 131072).arrayBuffer())
    const kind = sniffKind(head)
    const dims = kind ? readDimensions(head, kind) : null
    if (dims && dims.width * dims.height > MAX_PIXELS) return 'fail'
    // un svg se rasteriza con una etiqueta img, que nunca ejecuta scripts
    if (item.kind === 'svg') {
      const url = URL.createObjectURL(blob)
      try {
        const img = new Image()
        img.src = url
        await img.decode()
        return await createImageBitmap(img, { resizeWidth: SIZE, resizeQuality: 'medium' })
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    return await createImageBitmap(blob, { resizeWidth: SIZE, resizeQuality: 'medium', imageOrientation: 'from-image' })
  } catch {
    return 'fail'
  }
}

export const Thumb = memo(function Thumb({ item }: { item: Item }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // el efecto depende solo del id, así un cambio de estado de la fila no reinicia la miniatura
  const itemRef = useRef(item)
  itemRef.current = item
  const [state, setState] = useState<'loading' | 'ready' | 'fail'>(() => {
    const hit = cache.get(item.id)
    return hit ? (hit === 'fail' ? 'fail' : 'ready') : 'loading'
  })

  useEffect(() => {
    let alive = true
    const draw = (bmp: ImageBitmap) => {
      const c = canvas.current
      if (!c) return
      c.width = bmp.width
      c.height = bmp.height
      c.getContext('2d')?.drawImage(bmp, 0, 0)
    }

    const hit = cache.get(item.id)
    if (hit) {
      if (hit === 'fail') setState('fail')
      else {
        setState('ready')
        draw(hit)
      }
      return
    }

    // se espera un instante para no trabajar en filas que pasan volando al hacer scroll
    const timer = setTimeout(async () => {
      await acquire()
      if (!alive) {
        release()
        return
      }
      const res = await makeThumb(itemRef.current)
      release()
      if (cache.size >= MAX_CACHE) {
        const first = cache.keys().next().value
        if (first) {
          const old = cache.get(first)
          if (old && old !== 'fail') old.close()
          cache.delete(first)
        }
      }
      cache.set(item.id, res)
      if (!alive) return
      if (res === 'fail') setState('fail')
      else {
        setState('ready')
        draw(res)
      }
    }, 120)

    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [item.id])

  return (
    <span className="checker relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line">
      {state === 'fail' && <FileImage size={18} className="fade-in text-muted" />}
      <span
        className={`absolute inset-0 animate-pulse bg-sunken transition-opacity duration-500 ${state === 'loading' ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas
        ref={canvas}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </span>
  )
})
