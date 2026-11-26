// worker auxiliar que optimiza un PNG sin pérdida mientras el worker principal prepara la versión con paleta

import { optimisePng } from './engine'
import type { Settings } from './types'

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ buf: ArrayBuffer; settings: Settings }>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

ctx.onmessage = async (e) => {
  const out = await optimisePng(e.data.buf, e.data.settings)
  const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  ctx.postMessage(buf, [buf])
}
