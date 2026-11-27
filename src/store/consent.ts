import { create } from 'zustand'

/** lo que la persona permite guardar o enviar además de lo estrictamente necesario */
export interface Consent {
  /** recordar los ajustes de compresión entre visitas */
  settings: boolean
  /** conservar los archivos y los resultados al recargar la página, algo que siempre está activo para no perder el progreso */
  session: boolean
  /** sumar las imágenes comprimidas al contador global */
  counter: boolean
}

interface ConsentState extends Consent {
  /** false mientras la persona no haya elegido nada, que es cuando se muestra el aviso */
  decided: boolean
  save: (c: Consent) => void
  acceptAll: () => void
  rejectAll: () => void
}

const KEY = 'squeezo-consent'
// la sesión de trabajo nunca se apaga sola, porque perder lo que se lleva hecho al recargar no es lo que se espera
const NONE: Consent = { settings: false, session: true, counter: false }

function read(): { decided: boolean; consent: Consent } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<Consent>
      return { decided: true, consent: { settings: v.settings === true, session: true, counter: v.counter === true } }
    }
  } catch {
    /* sin almacenamiento se vuelve a preguntar en cada visita */
  }
  return { decided: false, consent: NONE }
}

const initial = read()

export const useConsent = create<ConsentState>((set) => ({
  ...initial.consent,
  decided: initial.decided,
  save: (c) => {
    c = { ...c, session: true }
    try {
      localStorage.setItem(KEY, JSON.stringify(c))
    } catch {
      /* la decisión rige durante la visita aunque no se pueda recordar */
    }
    set({ ...c, decided: true })
  },
  acceptAll: () => useConsent.getState().save({ settings: true, session: true, counter: true }),
  rejectAll: () => useConsent.getState().save(NONE),
}))
