import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../api/stats'

/** un Redis de mentira que responde a la API REST por lotes de Upstash */
function fakeRedis() {
  const store = new Map<string, number>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const commands = JSON.parse(init.body) as (string | number)[][]
      const result = commands.map(([cmd, key, arg]) => {
        const k = String(key)
        if (cmd === 'GET') return { result: store.has(k) ? String(store.get(k)) : null }
        if (cmd === 'INCR') return { result: store.set(k, (store.get(k) ?? 0) + 1).get(k) }
        if (cmd === 'INCRBY') return { result: store.set(k, (store.get(k) ?? 0) + Number(arg)).get(k) }
        return { result: 1 }
      })
      return new Response(JSON.stringify(result), { status: 200 })
    }),
  )
  return store
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('https://squeezo.test/api/stats', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': '1.2.3.4', ...headers } }))

describe('contador global', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = 'https://redis.test'
    process.env.KV_REST_API_TOKEN = 'token'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('devuelve cero si todavía no hay nada guardado', async () => {
    fakeRedis()
    expect(await (await GET()).json()).toEqual({ total: 0 })
  })

  it('suma las imágenes y devuelve la cifra nueva', async () => {
    fakeRedis()
    expect(await (await post({ n: 3 })).json()).toEqual({ total: 3 })
    expect(await (await post({ n: 2 })).json()).toEqual({ total: 5 })
  })

  it('limita lo que una sola petición puede sumar', async () => {
    fakeRedis()
    expect(await (await post({ n: 999999 })).json()).toEqual({ total: 1000 })
  })

  it('rechaza cantidades no válidas y orígenes ajenos', async () => {
    fakeRedis()
    expect((await post({ n: -4 })).status).toBe(400)
    expect((await post({ n: 'mucho' })).status).toBe(400)
    expect((await post({ n: 1 }, { origin: 'https://otra-web.com' })).status).toBe(403)
    expect((await post({ n: 1 }, { origin: 'null' })).status).toBe(403)
  })

  it('frena a quien envía demasiadas veces en un minuto', async () => {
    fakeRedis()
    let last = 200
    for (let i = 0; i < 22; i++) last = (await post({ n: 1 })).status
    expect(last).toBe(429)
  })

  it('avisa que no está disponible si Redis falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect((await GET()).status).toBe(503)
  })
})
