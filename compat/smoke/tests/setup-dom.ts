import { Window } from 'happy-dom'

/**
 * Fornisce un DOM (window, document, localStorage, ...) ai dist dei package (Quasar li richiede all'import) ma
 * mantiene il `fetch` nativo di Node: quello di happy-dom applica la CORS e perde le risposte dopo poche richieste.
 */
const win = new Window({ url: 'http://127.0.0.1/' })
const g = globalThis as Record<string, unknown>
g.window = win
for (const key of Object.getOwnPropertyNames(win)) {
  // solo cio' che Node non ha gia' (niente fetch, URL, AbortController, ...)
  if (key in g || key.startsWith('_')) continue
  try {
    const value = (win as unknown as Record<string, unknown>)[key]
    g[key] = typeof value === 'function' && !/^[A-Z]/.test(key) ? (value as () => unknown).bind(win) : value
  } catch {
    // proprieta' non leggibile: ignorata
  }
}
