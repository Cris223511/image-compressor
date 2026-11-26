// aplica lo que la persona decide en las preferencias de cookies. si retira un permiso se borra
// lo que ya estaba guardado, y si lo concede se empieza a guardar desde ese momento.

import { useConsent } from '../store/consent'
import { useSettings } from '../store/settings'
import { applySessionConsent } from './persist'

let started = false

export function startConsentEffects() {
  if (started) return
  started = true
  let last = useConsent.getState()
  useConsent.subscribe((now) => {
    if (now.settings !== last.settings) {
      if (now.settings) useSettings.setState((s) => ({ ...s }))
      else
        try {
          localStorage.removeItem('squeezo-settings')
        } catch {
          /* no hay nada que borrar */
        }
    }
    if (now.session !== last.session) void applySessionConsent(now.session)
    last = now
  })
}
