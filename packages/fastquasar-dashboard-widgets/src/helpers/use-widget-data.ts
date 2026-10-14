import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { getPachiWidgetsHttp, type IPachiWidgetsHttp } from './http'

/** Opzioni del composable `usePachiWidgetData`. */
export interface IUsePachiWidgetDataOptions<T> {
  /** Endpoint da interrogare (reattivo). */
  url: () => string
  /** Client HTTP opzionale (reattivo); se assente si usa quello risolto in `setup()`. */
  http: () => IPachiWidgetsHttp | undefined
  /** Intervallo di polling in ms (0 o negativo = disattivo). */
  refreshInterval: () => number
  /** Trasforma/valida la risposta grezza. */
  parse: (data: unknown) => T
  /** Valore iniziale e valore usato dopo un errore. */
  empty: T
}

/** Stato restituito da `usePachiWidgetData`. */
export interface IUsePachiWidgetData<T> {
  /** True durante il primo caricamento. */
  loading: Ref<boolean>
  /** True se l'ultima richiesta è fallita (distinto dallo stato vuoto). */
  error: Ref<boolean>
  /** Ultimo dato valido. */
  data: Ref<T>
  /** Rilancia la richiesta. */
  reload: () => Promise<void>
}

/**
 * Carica `url` con il client HTTP dei widget: fetch al mount, ricarica al cambio di `url`/`http`,
 * polling opzionale pulito all'unmount. Da chiamare dentro `setup()`.
 *
 * @param opts - opzioni (getter reattivi)
 * @returns stato reattivo e `reload`
 */
export function usePachiWidgetData<T>(opts: IUsePachiWidgetDataOptions<T>): IUsePachiWidgetData<T> {
  const injected = getPachiWidgetsHttp()
  const client = computed(() => opts.http() ?? injected)
  const loading = ref(true)
  const error = ref(false)
  const data = ref(opts.empty) as Ref<T>
  let timer: ReturnType<typeof setInterval> | null = null
  let seq = 0
  let alive = true

  async function reload(): Promise<void> {
    const my = ++seq
    try {
      const res = await client.value.Get<unknown>(opts.url(), { meta: { autoError: false } })
      if (!alive || my !== seq) return
      data.value = opts.parse(res)
      error.value = false
    } catch {
      if (!alive || my !== seq) return
      data.value = opts.empty
      error.value = true
    } finally {
      if (alive && my === seq) loading.value = false
    }
  }

  function stopTimer(): void {
    if (timer) clearInterval(timer)
    timer = null
  }

  function startTimer(): void {
    stopTimer()
    const ms = opts.refreshInterval()
    if (ms > 0) timer = setInterval(() => void reload(), ms)
  }

  onMounted(() => {
    void reload()
    startTimer()
  })
  watch([() => opts.url(), client], () => {
    loading.value = true
    void reload()
  })
  watch(() => opts.refreshInterval(), startTimer)
  onBeforeUnmount(() => {
    alive = false
    stopTimer()
  })

  return { loading, error, data, reload }
}
