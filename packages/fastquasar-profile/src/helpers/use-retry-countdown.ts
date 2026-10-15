import { computed, onBeforeUnmount, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { formatCountdown, remainingSeconds } from './retry-after'

/** Reactive countdown returned by {@link useRetryCountdown}. */
export interface IRetryCountdown {
  /** Remaining seconds (0 when not active). */
  remaining: Readonly<Ref<number>>
  /** `true` until the countdown has expired. */
  active: ComputedRef<boolean>
  /** `mm:ss` text of the remaining seconds. */
  text: ComputedRef<string>
  /** Starts (or restarts) the countdown with the given seconds. */
  start: (seconds: number) => void
  /** Stops the countdown and clears the notice. */
  stop: () => void
}

/**
 * Live countdown based on an absolute deadline (it stays correct even if the timer slows down in the
 * background). The timer is stopped when the component unmounts and once the deadline has passed.
 *
 * @returns reactive state and `start`/`stop` commands
 */
export function useRetryCountdown(): IRetryCountdown {
  const remaining = ref(0)
  let deadline = 0
  let timer: ReturnType<typeof setInterval> | null = null

  /** Stops the update timer. */
  function clear(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  /** Recomputes the remaining seconds and, at zero, stops the timer. */
  function tick(): void {
    remaining.value = remainingSeconds(deadline)
    if (remaining.value <= 0) clear()
  }

  /**
   * Starts (or restarts) the countdown.
   *
   * @param seconds - seconds to wait
   */
  function start(seconds: number): void {
    clear()
    deadline = Date.now() + Math.max(0, seconds) * 1000
    tick()
    if (remaining.value > 0) timer = setInterval(tick, 250)
  }

  /** Stops the countdown and resets the state. */
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
