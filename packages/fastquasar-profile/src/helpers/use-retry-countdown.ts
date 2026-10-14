import { computed, onBeforeUnmount, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { formatCountdown, remainingSeconds } from './retry-after'

/** Conto alla rovescia reattivo restituito da {@link useRetryCountdown}. */
export interface IRetryCountdown {
  /** Secondi residui (0 quando non attivo). */
  remaining: Readonly<Ref<number>>
  /** `true` finché il conto alla rovescia non è scaduto. */
  active: ComputedRef<boolean>
  /** Testo `mm:ss` dei secondi residui. */
  text: ComputedRef<string>
  /** Avvia (o riavvia) il conto con i secondi indicati. */
  start: (seconds: number) => void
  /** Ferma il conto e azzera l'avviso. */
  stop: () => void
}

/**
 * Conto alla rovescia live basato su una scadenza assoluta (resta corretto anche se il timer rallenta in
 * background). Il timer viene fermato allo smontaggio del componente e a scadenza avvenuta.
 *
 * @returns stato reattivo e comandi `start`/`stop`
 */
export function useRetryCountdown(): IRetryCountdown {
  const remaining = ref(0)
  let deadline = 0
  let timer: ReturnType<typeof setInterval> | null = null

  /** Ferma il timer di aggiornamento. */
  function clear(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  /** Ricalcola i secondi residui e, a zero, ferma il timer. */
  function tick(): void {
    remaining.value = remainingSeconds(deadline)
    if (remaining.value <= 0) clear()
  }

  /**
   * Avvia (o riavvia) il conto.
   *
   * @param seconds - secondi di attesa
   */
  function start(seconds: number): void {
    clear()
    deadline = Date.now() + Math.max(0, seconds) * 1000
    tick()
    if (remaining.value > 0) timer = setInterval(tick, 250)
  }

  /** Ferma il conto e azzera lo stato. */
  function stop(): void {
    clear()
    deadline = 0
    remaining.value = 0
  }

  onBeforeUnmount(clear)

  return {
    remaining,
    active: computed(() => remaining.value > 0),
    text: computed(() => formatCountdown(remaining.value)),
    start,
    stop,
  }
}
