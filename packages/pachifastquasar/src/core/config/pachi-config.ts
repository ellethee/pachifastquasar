import { DEFAULT_PACHI_CONFIG } from './defaults'
import { pachiConfigFromEnv } from './env'
import type { IAppConfig, PachiConfigInput, PachiEnv } from './types/app-config'

/** Oggetto semplice (non array, non componente Vue, non funzione): unico caso in cui si fa merge ricorsivo. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Merge ricorsivo di oggetti semplici: i valori `undefined` del sorgente non sovrascrivono. */
function merge<T extends Record<string, unknown>>(base: T, extra: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue
    const current = out[key]
    out[key] = isPlainObject(current) && isPlainObject(value) ? merge(current, value) : value
  }
  return out as T
}

/**
 * Applica i default a una configurazione parziale (merge ricorsivo sui soli oggetti semplici; array,
 * funzioni e componenti Vue sostituiscono il valore).
 *
 * @param input - configurazione fornita dall'app (anche parziale)
 * @returns configurazione completa
 */
export function resolvePachiConfig(input: PachiConfigInput = {}): IAppConfig {
  return merge(
    DEFAULT_PACHI_CONFIG as unknown as Record<string, unknown>,
    input as Record<string, unknown>
  ) as unknown as IAppConfig
}

/**
 * Unisce più configurazioni parziali (merge ricorsivo sui soli oggetti semplici; array, funzioni e
 * componenti Vue sostituiscono; i valori `undefined` non sovrascrivono). Le successive vincono sulle
 * precedenti, ma ciò che non specificano resta com'era: nessuna impostazione già presente va persa.
 *
 * @param configs - configurazioni da unire, dalla meno alla più prioritaria
 * @returns configurazione parziale unita
 */
export function mergePachiConfig(...configs: (PachiConfigInput | undefined)[]): PachiConfigInput {
  return configs.reduce<Record<string, unknown>>(
    (acc, item) => (item ? merge(acc, item as Record<string, unknown>) : acc),
    {}
  ) as PachiConfigInput
}

/**
 * Configurazione dell'app: base scritta nel codice + override dalle variabili d'ambiente. Le variabili
 * impostate vincono sulla base; quelle assenti non toccano nulla. Equivale a
 * `mergePachiConfig(base, pachiConfigFromEnv(env), ...overrides)`.
 *
 * @param base - configurazione di base dell'app (logo, componenti, menu, default propri)
 * @param env - tipicamente `import.meta.env`
 * @param overrides - ulteriori override (più prioritari anche dell'ambiente)
 * @returns configurazione parziale, da passare a `createPachiApp`/`createPachiRouter`
 */
export function definePachiConfig(
  base: PachiConfigInput,
  env: PachiEnv = {},
  ...overrides: PachiConfigInput[]
): PachiConfigInput {
  return mergePachiConfig(base, pachiConfigFromEnv(env), ...overrides)
}

let current: IAppConfig = resolvePachiConfig()

/**
 * Registra la configurazione della shell (con i default applicati). Va chiamata prima di creare router
 * e app: lo fanno già `createPachiRouter` e `createPachiApp` se ricevono `config`.
 *
 * @param input - configurazione fornita dall'app (anche parziale)
 * @returns la configurazione risolta
 */
export function setPachiConfig(input: PachiConfigInput = {}): IAppConfig {
  current = resolvePachiConfig(input)
  return current
}

/**
 * Configurazione corrente della shell (default se non è mai stata impostata).
 *
 * @returns configurazione risolta
 */
export function getPachiConfig(): IAppConfig {
  return current
}
