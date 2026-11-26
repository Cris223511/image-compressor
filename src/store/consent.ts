import { create } from 'zustand'

/** lo que la persona permite guardar o enviar además de lo estrictamente necesario */
export interface Consent {
  /** recordar los ajustes de compresión entre visitas */
  settings: boolean
  /** conservar los archivos y los resultados al recargar la página */
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
const NONE: Consent = { settings: false, session: false, counter: false }

function read(): { decided: boolean; consent: Consent } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<Consent>
      return { decided: true, consent: { settings: v.settings === true, session: v.session === true, counter: v.counter === true } }
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
