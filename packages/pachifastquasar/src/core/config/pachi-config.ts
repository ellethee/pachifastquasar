import { DEFAULT_PACHI_CONFIG } from './defaults'
import { pachiConfigFromEnv } from './env'
import type { IAppConfig, PachiConfigInput, PachiEnv } from './types/app-config'

/** Plain object (not an array, Vue component or function): the only case in which a recursive merge is done. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Recursive merge of plain objects: `undefined` values in the source do not overwrite. */
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
 * Applies the defaults to a partial configuration (recursive merge on plain objects only; arrays,
 * functions and Vue components replace the value).
 *
 * @param input - configuration provided by the app (even partial)
 * @returns complete configuration
 */
export function resolvePachiConfig(input: PachiConfigInput = {}): IAppConfig {
  return merge(
    DEFAULT_PACHI_CONFIG as unknown as Record<string, unknown>,
    input as Record<string, unknown>
  ) as unknown as IAppConfig
}

/**
 * Merges several partial configurations (recursive merge on plain objects only; arrays, functions and
 * Vue components replace; `undefined` values do not overwrite). Later ones win over
 * earlier ones, but whatever they do not specify stays as it was: no existing setting is lost.
 *
 * @param configs - configurations to merge, from lowest to highest priority
 * @returns merged partial configuration
 */
export function mergePachiConfig(...configs: (PachiConfigInput | undefined)[]): PachiConfigInput {
  return configs.reduce<Record<string, unknown>>(
    (acc, item) => (item ? merge(acc, item as Record<string, unknown>) : acc),
    {}
  ) as PachiConfigInput
}

/**
 * App configuration: base written in code + overrides from environment variables. Set variables
 * win over the base; absent ones touch nothing. Equivalent to
 * `mergePachiConfig(base, pachiConfigFromEnv(env), ...overrides)`.
 *
 * @param base - app base configuration (logo, components, menu, own defaults)
 * @param env - tipicamente `import.meta.env`
 * @param overrides - further overrides (higher priority than the environment too)
 * @returns partial configuration, to pass to `createPachiApp`/`createPachiRouter`
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
 * Registers the shell configuration (with defaults applied). Must be called before creating router
 * and app: `createPachiRouter` and `createPachiApp` already do it if they receive `config`.
 *
 * @param input - configuration provided by the app (even partial)
 * @returns the resolved configuration
 */
export function setPachiConfig(input: PachiConfigInput = {}): IAppConfig {
  current = resolvePachiConfig(input)
  return current
}

/**
 * Current shell configuration (defaults if it was never set).
 *
 * @returns resolved configuration
 */
export function getPachiConfig(): IAppConfig {
  return current
}
