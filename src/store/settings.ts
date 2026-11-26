import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useConsent } from './consent'
import { DEFAULT_SETTINGS, type Settings } from '../lib/compress/types'

interface SettingsState {
  settings: Settings
  patch: (p: Partial<Settings>) => void
  reset: () => void
}

// los ajustes se recuerdan entre visitas solo si la persona lo permitió en las preferencias de cookies
const gatedStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (useConsent.getState().settings) localStorage.setItem(key, value)
    } catch {
      /* con el almacenamiento bloqueado o lleno los ajustes solo rigen durante la visita */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* no hay nada que borrar */
    }
  },
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      patch: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'squeezo-settings',
      storage: createJSONStorage(() => gatedStorage),
      // la versión 2 renombró los niveles de compresión, por eso lo guardado antes vuelve al valor por defecto
      version: 2,
      migrate: () => ({ settings: DEFAULT_SETTINGS }) as never,
    },
  ),
)
