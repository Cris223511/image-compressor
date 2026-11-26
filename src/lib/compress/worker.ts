// punto de entrada del web worker. recibe un trabajo, lo resuelve y devuelve el resultado
// transfiriendo el buffer en lugar de copiarlo.

import { runJob } from './engine'
import type { JobRequest } from './types'

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<JobRequest | { warm: true }>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

/** carga y arranca los codificadores más usados con una imagen mínima, sin devolver nada */
async function warm() {
  try {
    const jpeg = await import('@jsquash/jpeg')
    await jpeg.encode(new ImageData(8, 8), { quality: 75 })
    const png = await import('@jsquash/png')
    const { optimise } = await import('@jsquash/oxipng')
    await optimise(await png.encode(new ImageData(8, 8)), { level: 2, interlace: false, optimiseAlpha: true })
  } catch {
    /* si algo falla, cada codificador se carga cuando haga falta */
  }
}

ctx.onmessage = async (e) => {
  if ('warm' in e.data) return void (await warm())
  const result = await runJob(e.data)
  const transfer: Transferable[] = result.ok && result.bytes ? [result.bytes] : []
  ctx.postMessage(result, transfer)
}
