import { useCallback } from 'react'
import { useUi } from '../store/ui'
import es from './locales/es.json'
import en from './locales/en.json'

export type Dict = typeof es

const dictionaries: Record<'es' | 'en', Dict> = { es, en: en as unknown as Dict }

export const LOCALES = { es: 'es-PE', en: 'en-US' } as const

function lookup(dict: unknown, path: string): unknown {
  let cur: any = dict
  for (const part of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[part]
  }
  return cur
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/** traduce una clave con puntos. si trae count busca la variante _one o _other */
export function translate(lang: 'es' | 'en', key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[lang]
  let value = lookup(dict, key)
  if (vars && typeof vars.count === 'number') {
    const plural = lookup(dict, `${key}_${vars.count === 1 ? 'one' : 'other'}`)
    if (typeof plural === 'string') value = plural
  }
  return typeof value === 'string' ? interpolate(value, vars) : key
}

export function useT() {
  const lang = useUi((s) => s.lang)
  return useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])
}

/** acceso al diccionario completo, para las páginas con listas y secciones */
export function useDict(): Dict {
  const lang = useUi((s) => s.lang)
  return dictionaries[lang]
}

export function useLocale(): string {
  const lang = useUi((s) => s.lang)
  return LOCALES[lang]
}
