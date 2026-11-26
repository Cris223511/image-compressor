// punto de entrada del web worker: recibe un trabajo, lo resuelve y devuelve el resultado
// transfiriendo el buffer en lugar de copiarlo.

import { runJob } from './engine'
import type { JobRequest } from './types'

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<JobRequest>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

ctx.onmessage = async (e) => {
  const result = await runJob(e.data)
  const transfer: Transferable[] = result.ok && result.bytes ? [result.bytes] : []
  ctx.postMessage(result, transfer)
}
