import { create } from 'zustand'

export type Theme = 'light' | 'dark'
export type Lang = 'es' | 'en'

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('squeezo-theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* sin almacenamiento, se usa la preferencia del sistema */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readLang(): Lang {
  try {
    const l = localStorage.getItem('squeezo-lang')
    if (l === 'es' || l === 'en') return l
  } catch {
    /* igual que arriba */
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

interface UiState {
  theme: Theme
  lang: Lang
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
}

export const useUi = create<UiState>((set) => ({
  theme: readTheme(),
  lang: readLang(),
  setTheme: (theme) => {
    const root = document.documentElement
    root.classList.add('theme-fade')
    window.setTimeout(() => root.classList.remove('theme-fade'), 500)
    root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('squeezo-theme', theme)
    } catch {
      /* no pasa nada si no se puede recordar */
    }
    set({ theme })
  },
  setLang: (lang) => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('squeezo-lang', lang)
    } catch {
      /* igual que arriba */
    }
    set({ lang })
  },
}))
