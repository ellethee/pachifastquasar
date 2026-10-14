import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Client HTTP minimale richiesto dai widget (un'istanza alova dell'app lo soddisfa se avvolta). */
export interface IPachiWidgetsHttp {
  Get<T = unknown>(url: string, config?: Record<string, unknown>): PromiseLike<T>
}

/** Restituisce il client HTTP dei widget. */
export type PachiWidgetsHttpFactory = () => IPachiWidgetsHttp

let factory: PachiWidgetsHttpFactory | null = null

/** Cache del client ricavato da `@ilpachi/use-alova`, legata all'identità della factory che l'ha prodotto. */
let cached: { source: unknown; client: IPachiWidgetsHttp } | null = null

/**
 * Sostituisce il client HTTP di default (es. per aggiungere auth e gestione errori).
 * Da chiamare una sola volta all'avvio dell'app.
 *
 * @param f - factory che restituisce il client HTTP
 */
export function setPachiWidgetsHttp(f: PachiWidgetsHttpFactory): void {
  factory = f
}

/**
 * Restituisce il client HTTP corrente. Ordine: factory impostata con `setPachiWidgetsHttp`; altrimenti
 * l'istanza globale di `@ilpachi/use-alova` (`getUseAlovaInstance()`, registrata da `createPachiApp`),
 * con auth, refresh del token ed errori. Il client ricavato è in cache finché la factory globale non cambia.
 *
 * @returns client HTTP
 * @throws Error se non c'è né un client registrato né un'istanza di use-alova
 */
export function getPachiWidgetsHttp(): IPachiWidgetsHttp {
  if (factory) return factory()
  let source: ReturnType<typeof getUseAlovaInstance>
  try {
    source = getUseAlovaInstance()
  } catch (cause) {
    throw new Error(
      '@ilpachi/fastquasar-dashboard-widgets needs an @ilpachi/use-alova client: call createUseAlova() ' +
        '(done by createPachiApp of @ilpachi/pachifastquasar) or register a client with setPachiWidgetsHttp()',
      { cause },
    )
  }
  if (!cached || cached.source !== source) {
    cached = { source, client: source().alova as unknown as IPachiWidgetsHttp }
  }
  return cached.client
}

/** Solo per i test: azzera il client registrato e la cache. */
export function resetPachiWidgetsHttp(): void {
  factory = null
  cached = null
}
