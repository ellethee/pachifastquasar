import { usePagination } from 'alova/client'
import { getUseAlovaInstance } from '@ilpachi/use-alova'
import type { UseAlovaReturn } from '@ilpachi/use-alova'

export { usePagination }

/** Opzioni per la creazione dell'istanza alova usata dalla tabella. */
export interface IPachiAlovaOptions {
  /** URL base delle richieste della tabella (es. `/api/users`). */
  url?: string
}

/** Istanza alova usata dai componenti Pachi (con le utility Get/Post/Put/Patch/Delete). */
export type AlovaExt = UseAlovaReturn['alova']

/** Factory per creare l'istanza alova a partire dalle opzioni. */
export type PachiAlovaFactory = (options?: IPachiAlovaOptions) => AlovaExt

let customFactory: PachiAlovaFactory | null = null

/** Ultima istanza creata dal default, riusata finché `useAlova` e url non cambiano. */
let cache: { useAlova: unknown, url: string, alova: AlovaExt } | null = null

/**
 * Sostituisce la risoluzione automatica dell'istanza alova con una factory personalizzata.
 * Da chiamare una sola volta all'avvio dell'app. Ha la precedenza su tutto il resto.
 *
 * @param factory - factory che restituisce un'istanza alova
 */
export function setPachiAlovaFactory(factory: PachiAlovaFactory): void {
  customFactory = factory
}

/**
 * Crea l'istanza alova della tabella. Ordine di risoluzione:
 * 1. la factory impostata con `setPachiAlovaFactory`;
 * 2. l'istanza di `@ilpachi/use-alova` (`getUseAlovaInstance()`), registrata da `createUseAlova()`
 *    (fatto da `createPachiApp` di `@ilpachi/pachifastquasar`): porta con sé header di autenticazione,
 *    refresh del token e gestione errori.
 *
 * @param options - opzioni dell'istanza (url base)
 * @returns istanza alova
 * @throws Error se non c'è una factory registrata né un'istanza di use-alova
 */
export function createPachiAlova(options: IPachiAlovaOptions = {}): AlovaExt {
  if (customFactory) return customFactory(options)
  let useAlova: ReturnType<typeof getUseAlovaInstance>
  try {
    useAlova = getUseAlovaInstance()
  } catch (error) {
    throw new Error(
      '@ilpachi/pachi-kit/table needs an @ilpachi/use-alova client: call createUseAlova() '
      + '(done by createPachiApp of @ilpachi/pachifastquasar) or register one with setPachiAlovaFactory()',
      { cause: error },
    )
  }
  const url = options.url ?? ''
  if (cache && cache.useAlova === useAlova && cache.url === url) return cache.alova
  const alova = useAlova({ url }).alova
  cache = { useAlova, url, alova }
  return alova
}
