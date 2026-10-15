import { Window } from 'happy-dom'

/**
 * Provides a DOM (window, document, localStorage, ...) to the packages' dist (Quasar requires it on import) but
 * keeps Node's native `fetch`: happy-dom's one applies CORS and drops responses after a few requests.
 */
const win = new Window({ url: 'http://127.0.0.1/' })
const g = globalThis as Record<string, unknown>
g.window = win
for (const key of Object.getOwnPropertyNames(win)) {
  // only what Node does not already have (no fetch, URL, AbortController, ...)
  if (key in g || key.startsWith('_')) continue
  try {
    const value = (win as unknown as Record<string, unknown>)[key]
    g[key] = typeof value === 'function' && !/^[A-Z]/.test(key) ? (value as () => unknown).bind(win) : value
  } catch {
    // unreadable property: ignored
  }
}
