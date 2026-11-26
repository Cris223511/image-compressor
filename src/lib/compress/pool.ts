// grupo de workers que reparte las imágenes entre los núcleos del equipo. se limita a unos
// pocos porque cada imagen grande ocupa decenas de megas mientras se codifica.

import { JOB_TIMEOUT_MS } from '../../config/limits'
import { readDimensions, sniffKind } from '../formats'
import { runGifJob } from './gif'
import type { JobRequest, JobResult } from './types'

interface Slot {
  worker: Worker
  busy: boolean
}

interface Task {
  req: JobRequest
  resolve: (r: JobResult) => void
  /** megapíxeles que ocupará al decodificarse, para no cargar el equipo de más */
  weight: number
  /** hasta que no se lee la cabecera la tarea no empieza, así el presupuesto usa el tamaño real */
  weighed: boolean
}

/** máximo de workers en paralelo */
const MAX_WORKERS = 8
/** tope de píxeles que se decodifican a la vez entre todos los workers */
const PIXEL_BUDGET = 120_000_000
/** lo que se supone de una imagen cuya cabecera no se puede leer, como las entradas de un zip */
const DEFAULT_WEIGHT = 8_000_000

export class CompressionPool {
  private slots: Slot[] = []
  private queue: Task[] = []
  private size: number
  private inflight = 0

  constructor() {
    const cores = navigator.hardwareConcurrency || 4
    // antes el tope era 4 sin importar los núcleos del equipo, y se deja a mano por si hay que volver a él
    // this.size = Math.max(1, Math.min(4, cores - 1))
    // ahora se aprovechan hasta 8 núcleos, y el presupuesto de píxeles sigue limitando la memoria
    this.size = Math.max(1, Math.min(MAX_WORKERS, cores - 1))
  }

  /** prepara workers y codificadores mientras la persona revisa la lista, para que comprimir arranque sin esperas */
  warm(count: number) {
    while (this.slots.length < Math.min(count, this.size)) {
      this.spawn().worker.postMessage({ warm: true })
    }
  }

  /** cuántas imágenes conviene tener en vuelo a la vez, con uno de margen para los gif */
  get lanes(): number {
    return this.size + 1
  }

  submit(req: JobRequest): Promise<JobResult> {
    // gifsicle gestiona su propio worker y es lento, por eso no debe ocupar uno del grupo mientras trabaja
    if (req.kind === 'gif') return runGifJob(req)
    return new Promise((resolve) => {
      // entra a la cola de inmediato para respetar el orden de llegada, pero espera a conocer su peso para empezar
      const task: Task = { req, resolve, weight: DEFAULT_WEIGHT, weighed: false }
      this.queue.push(task)
      void this.weigh(req).then((w) => {
        task.weight = w
        task.weighed = true
        this.pump()
      })
    })
  }

  /** lee la cabecera del archivo para saber cuántos píxeles tendrá */
  private async weigh(req: JobRequest): Promise<number> {
    const s = req.source
    if (s.kind === 'file') {
      try {
        const head = new Uint8Array(await s.file.slice(0, 131072).arrayBuffer())
        const kind = sniffKind(head)
        const d = kind ? readDimensions(head, kind) : null
        if (d) return d.width * d.height
      } catch {
        /* se usa el peso supuesto */
      }
    }
    return DEFAULT_WEIGHT
  }

  /** descarta lo que aún no empezó. lo que ya está en un worker termina solo */
  cancelQueued() {
    for (const t of this.queue.splice(0)) t.resolve({ id: t.req.id, ok: false, error: 'cancelled' })
  }

  private spawn(): Slot {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    const slot: Slot = { worker, busy: false }
    this.slots.push(slot)
    return slot
  }

  private pump() {
    while (this.queue.length) {
      // la primera de la cola manda, y si aún no se conoce su peso se espera
      if (!this.queue[0].weighed) return
      // si ya hay trabajo en curso y esta imagen lo pasaría del presupuesto, espera a que termine algo
      if (this.inflight > 0 && this.inflight + this.queue[0].weight > PIXEL_BUDGET) return
      let slot = this.slots.find((s) => !s.busy)
      if (!slot && this.slots.length < this.size) slot = this.spawn()
      if (!slot) return
      this.start(slot, this.queue.shift()!)
    }
  }

  private start(slot: Slot, task: Task) {
    slot.busy = true
    const weight = task.weight
    this.inflight += weight
    let settled = false

    // libera el slot (o lo reemplaza si el worker quedó mal) una sola vez por tarea
    const settle = (replace: boolean): boolean => {
      if (settled) return false
      settled = true
      this.inflight -= weight
      clearTimeout(timer)
      slot.worker.onmessage = null
      slot.worker.onerror = null
      if (replace) {
        slot.worker.terminate()
        this.slots = this.slots.filter((s) => s !== slot)
      } else {
        slot.busy = false
      }
      return true
    }
    const finish = (r: JobResult, replace = false) => {
      if (!settle(replace)) return
      task.resolve(r)
      this.pump()
    }

    // si un worker se cuelga (una imagen rarísima) se corta y se reemplaza
    const timer = setTimeout(() => finish({ id: task.req.id, ok: false, error: 'timeout' }, true), JOB_TIMEOUT_MS)

    slot.worker.onmessage = (e: MessageEvent<JobResult>) => {
      const r = e.data
      // un gif que venía con otra extensión se descubre dentro del worker, que lo devuelve para
      // que lo resuelva gifsicle ya con el slot libre
      if (!r.ok && r.error === 'unsupported' && r.detail === 'gif') {
        if (settle(false)) {
          runGifJob(task.req).then(task.resolve)
          this.pump()
        }
        return
      }
      finish(r)
    }
    slot.worker.onerror = () => finish({ id: task.req.id, ok: false, error: 'decode', detail: 'worker' }, true)
    slot.worker.postMessage(task.req)
  }
}
