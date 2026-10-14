import type { QVueGlobals } from 'quasar'

let current: QVueGlobals | null = null

/**
 * Registra l'istanza `$q` dell'app (la chiama `createPachiApp`). I plugin di Quasar (Dialog, Notify,
 * Loading) fuori da un componente vanno usati da qui e non importati da `quasar`: in sviluppo un
 * pacchetto in `node_modules` riceve una copia diversa del plugin, senza `create` (non installata).
 *
 * @param $q - `app.config.globalProperties.$q`
 */
export function setPachiQuasar($q: QVueGlobals): void {
  current = $q
}

/**
 * Istanza `$q` dell'app registrata da `createPachiApp`.
 *
 * @returns l'istanza di Quasar
 * @throws se `createPachiApp` non è stata ancora chiamata
 */
export function getPachiQuasar(): QVueGlobals {
  if (!current) throw new Error('Quasar non inizializzato: chiama createPachiApp nel boot file')
  return current
}
