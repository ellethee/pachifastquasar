import { usePagination } from 'alova/client'
import { getUseAlovaInstance } from '@ilpachi/use-alova'
import type { UseAlovaReturn } from '@ilpachi/use-alova'

export { usePagination }

/** Options for creating the alova instance used by the table. */
export interface IPachiAlovaOptions {
  /** Base URL of the table requests (e.g. `/api/users`). */
  url?: string
}

/** Alova instance used by the Pachi components (with the Get/Post/Put/Patch/Delete utilities). */
export type AlovaExt = UseAlovaReturn['alova']

/** Factory creating the alova instance from the options. */
export type PachiAlovaFactory = (options?: IPachiAlovaOptions) => AlovaExt

let customFactory: PachiAlovaFactory | null = null

/** Last instance created by the default, reused until `useAlova` and url change. */
let cache: { useAlova: unknown, url: string, alova: AlovaExt } | null = null

/**
 * Replaces the automatic resolution of the alova instance with a custom factory.
 * Call it once at app startup. It takes precedence over everything else.
 *
 * @param factory - factory returning an alova instance
 */
export function setPachiAlovaFactory(factory: PachiAlovaFactory): void {
  customFactory = factory
}

/**
 * Creates the table's alova instance. Resolution order:
 * 1. the factory set with `setPachiAlovaFactory`;
 * 2. the `@ilpachi/use-alova` instance (`getUseAlovaInstance()`), registered by `createUseAlova()`
 *    (done by `createPachiApp` of `@ilpachi/pachifastquasar`): it brings authentication headers,
 *    token refresh and error handling.
 *
 * @param options - instance options (base url)
 * @returns alova instance
 * @throws Error if there is no registered factory nor a use-alova instance
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
