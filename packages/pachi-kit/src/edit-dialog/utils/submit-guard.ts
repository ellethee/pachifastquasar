/** Guardia anti-rientro per azioni asincrone (salvataggio, conferma). */
export interface ISubmitGuard {
  /** `true` se l'azione e' in corso. */
  readonly busy: boolean
  /**
   * Prova a iniziare un'azione.
   * @returns `false` se ce n'e' gia' una in corso (da ignorare), altrimenti `true`
   */
  enter: () => boolean
  /** Segnala la fine dell'azione (successo, errore o annullamento). Idempotente. */
  leave: () => void
}

/**
 * Crea una guardia che impedisce di avviare due volte la stessa azione (doppio click).
 * Se nessuno chiama `leave()` entro `timeoutMs` la guardia si libera da sola, cosi' un listener
 * che non chiama mai `onSuccess`/`onError` non blocca il dialog per sempre.
 * @param timeoutMs tempo massimo di blocco in millisecondi (default 10000)
 */
export function createSubmitGuard(timeoutMs = 10_000): ISubmitGuard {
  let busy = false
  let timer: ReturnType<typeof setTimeout> | null = null
  function leave(): void {
    busy = false
    if (timer) clearTimeout(timer)
    timer = null
  }
  function enter(): boolean {
    if (busy) return false
    busy = true
    timer = setTimeout(leave, timeoutMs)
    return true
  }
  return {
    get busy() { return busy },
    enter,
    leave,
  }
}
