import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { getPachiWidgetsHttp, type IPachiWidgetsHttp } from './http'

/** Options of the composable `usePachiWidgetData`. */
export interface IUsePachiWidgetDataOptions<T> {
  /** Endpoint to query (reactive). */
  url: () => string
  /** Optional HTTP client (reactive); if absent, the one resolved in `setup()` is used. */
  http: () => IPachiWidgetsHttp | undefined
  /** Polling interval in ms (0 or negative = disabled). */
  refreshInterval: () => number
  /** Transforms/validates the raw response. */
  parse: (data: unknown) => T
  /** Initial value and value used after an error. */
  empty: T
}

/** State returned by `usePachiWidgetData`. */
export interface IUsePachiWidgetData<T> {
  /** True during the first load. */
  loading: Ref<boolean>
  /** True if the last request failed (distinct from the empty state). */
  error: Ref<boolean>
  /** Last valid data. */
  data: Ref<T>
  /** Re-runs the request. */
  reload: () => Promise<void>
}

/**
 * Loads `url` with the widgets HTTP client: fetch on mount, reload when `url`/`http` change,
 * optional polling cleaned up on unmount. Call it inside `setup()`.
 *
 * @param opts - options (reactive getters)
 * @returns reactive state and `reload`
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
