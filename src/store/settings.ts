import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SETTINGS, type Settings } from '../lib/compress/types'

interface SettingsState {
  settings: Settings
  patch: (p: Partial<Settings>) => void
  reset: () => void
}

// los ajustes se recuerdan entre visitas; todo parte apagado salvo la compresión sin pérdida visible
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      patch: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'squeezo-settings',
      // la versión 2 renombró los niveles de compresión: lo guardado antes vuelve al valor por defecto
      version: 2,
      migrate: () => ({ settings: DEFAULT_SETTINGS }) as never,
    },
  ),
)
