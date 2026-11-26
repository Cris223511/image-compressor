// contador global de imágenes comprimidas. guarda un único número en Redis (Upstash) y no recibe
// nada más: ni archivos, ni nombres, ni identificadores de quien usa la herramienta.

const KEY = 'squeezo:total'
/** tope de imágenes que una sola petición puede sumar, para que un valor absurdo no desfigure la cifra */
const MAX_PER_REQUEST = 1000
/** peticiones de escritura permitidas por minuto desde una misma dirección */
const MAX_WRITES_PER_MINUTE = 20

type Command = (string | number)[]

/** ejecuta varios comandos de Redis en una sola llamada a la API REST de Upstash */
async function redis(commands: Command[]): Promise<unknown[]> {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('sin configuración de Redis')
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Redis respondió ${res.status}`)
  const out = (await res.json()) as { result?: unknown; error?: string }[]
  const failed = out.find((o) => o.error)
  if (failed) throw new Error(failed.error)
  return out.map((o) => o.result)
}

/** la dirección no se guarda tal cual: solo una huella corta que caduca al cabo de un minuto */
async function fingerprint(request: Request): Promise<string> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconocida'
  const bytes = new TextEncoder().encode(`${ip}:${new Date().getUTCMinutes()}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('')
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** la cifra actual */
export async function GET(): Promise<Response> {
  try {
    const [total] = await redis([['GET', KEY]])
    return json({ total: Number(total) || 0 })
  } catch {
    return json({ error: 'no disponible' }, 503)
  }
}

/** suma las imágenes comprimidas en una sesión y devuelve la cifra nueva */
export async function POST(request: Request): Promise<Response> {
  // solo se acepta desde la propia web, no desde otras páginas
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'origen no permitido' }, 403)

  let n = 0
  try {
    n = Math.floor(Number(((await request.json()) as { n?: unknown }).n))
  } catch {
    return json({ error: 'solicitud no válida' }, 400)
  }
  if (!Number.isFinite(n) || n < 1) return json({ error: 'solicitud no válida' }, 400)
  n = Math.min(n, MAX_PER_REQUEST)

  try {
    const bucket = `squeezo:rate:${await fingerprint(request)}`
    const [count] = await redis([['INCR', bucket], ['EXPIRE', bucket, 60]])
    if (Number(count) > MAX_WRITES_PER_MINUTE) return json({ error: 'demasiadas solicitudes' }, 429)
    const [total] = await redis([['INCRBY', KEY, n]])
    return json({ total: Number(total) || 0 })
  } catch {
    return json({ error: 'no disponible' }, 503)
  }
}
