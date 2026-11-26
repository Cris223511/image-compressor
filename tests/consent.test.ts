import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** un almacenamiento local de mentira, para poder comprobar lo que se guarda */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  return data
}

describe('consentimiento', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('sin decisión previa todo lo opcional está apagado y se pregunta', async () => {
    fakeStorage()
    const { useConsent } = await import('../src/store/consent')
    const s = useConsent.getState()
    expect([s.decided, s.settings, s.session, s.counter]).toEqual([false, false, false, false])
  })

  it('aceptar activa los tres permisos y los recuerda', async () => {
    const data = fakeStorage()
    const { useConsent } = await import('../src/store/consent')
    useConsent.getState().acceptAll()
    expect(useConsent.getState()).toMatchObject({ decided: true, settings: true, session: true, counter: true })
    expect(JSON.parse(data.get('squeezo-consent')!)).toEqual({ settings: true, session: true, counter: true })
  })

  it('rechazar deja todo apagado pero marca la decisión como tomada', async () => {
    fakeStorage()
    const { useConsent } = await import('../src/store/consent')
    useConsent.getState().rejectAll()
    expect(useConsent.getState()).toMatchObject({ decided: true, settings: false, session: false, counter: false })
  })

  it('al volver recupera la decisión guardada', async () => {
    fakeStorage({ 'squeezo-consent': JSON.stringify({ settings: true, session: false, counter: true }) })
    const { useConsent } = await import('../src/store/consent')
    expect(useConsent.getState()).toMatchObject({ decided: true, settings: true, session: false, counter: true })
  })

  it('un valor guardado alterado no concede permisos de más', async () => {
    fakeStorage({ 'squeezo-consent': JSON.stringify({ settings: 'sí', session: 1 }) })
    const { useConsent } = await import('../src/store/consent')
    expect(useConsent.getState()).toMatchObject({ settings: false, session: false, counter: false })
  })

  it('el contador no envía nada sin permiso y sí con él', async () => {
    fakeStorage()
    const fetchMock = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const { useConsent } = await import('../src/store/consent')
    const { reportCompressed } = await import('../src/lib/stats')
    reportCompressed(3)
    expect(fetchMock).not.toHaveBeenCalled()
    useConsent.getState().save({ settings: false, session: false, counter: true })
    reportCompressed(3)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    reportCompressed(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
