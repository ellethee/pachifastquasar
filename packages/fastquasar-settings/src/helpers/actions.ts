/** Dependencies passed to actions (injected by the caller: the module does not import Quasar). */
export interface ISettingsActionDeps {
  /** Quasar `Dark` plugin (or a substitute in tests). */
  Dark?: { set: (v: boolean | 'auto') => void; toggle: () => void }
  /** Quasar `Notify` plugin. */
  Notify?: { create: (opts: { message: string; type?: string }) => unknown }
  /** `$q` instance (only for the script-string fallback). */
  $q?: unknown
}

/**
 * `events`/`watch` trigger as it comes from the schema: legacy string (`name`, `name:arg`, historical script)
 * or `{ action, args }` object (pachifast format; `args` is a JSON object, but an array or a single value
 * are also accepted).
 */
export type SettingsActionSpec = string | { action: string; args?: unknown }

/** Context received by an action. */
export interface ISettingsActionContext extends ISettingsActionDeps {
  /**
   * Text argument: the part after `:` in the `name:argument` string, or (object form) the first
   * scalar argument (single value or first element of an array), converted to string.
   */
  arg?: string
  /** Arguments declared by the schema, normalized to an array (`undefined` -> `[]`, single value -> `[value]`). */
  args?: unknown[]
  /** Named arguments (pachifast `args`, e.g. `{ mode: 'dark' }`); `{}` if `args` is not an object. */
  params?: Record<string, unknown>
}

/** Action handler: receives the context and the event arguments (for `watch`, the new value). */
export type SettingsActionHandler = (ctx: ISettingsActionContext, ...args: unknown[]) => unknown

/** Already resolved event/watch handler. */
export type SettingsResolvedHandler = (...args: unknown[]) => unknown

/** Options for resolving a spec. */
export interface IResolveActionOptions {
  /** Dependencies injected into actions. */
  deps: ISettingsActionDeps
  /** Enables the `new Function` fallback on script strings (default false). */
  allowScriptStrings?: boolean
}

/** Built-in actions (whitelist). */
const builtinActions: Record<string, SettingsActionHandler> = {
  /** Toggles the dark/light theme. */
  darkToggle: ({ Dark }) => Dark?.toggle(),
  /** Sets the dark theme: `arg` (`dark`/`light`/`auto`) or the event value (boolean or string). */
  darkSet: ({ Dark, arg, params }, value) => {
    const v = arg ?? params?.mode ?? value
    Dark?.set(v === 'auto' ? 'auto' : v === 'dark' || v === true)
  },
  /** Sets the dark theme when the event value equals `arg` (default `dark`). */
  darkSetWhenEquals: ({ Dark, arg, params }, value) => Dark?.set(value === (arg ?? params?.value ?? 'dark')),
  /** Shows a notification with the `arg` text. */
  notify: ({ Notify, arg, params }) => Notify?.create({ message: arg ?? String(params?.message ?? '') }),
}

const customActions = new Map<string, SettingsActionHandler>()

/**
 * Registers named app actions, usable in the schema `events`/`watch` fields
 * (e.g. `"events": { "update:modelValue": "refreshMenu" }`). They override the built-in ones.
 *
 * @param actions - action name -> handler map
 */
export function registerSettingsActions(actions: Record<string, SettingsActionHandler>): void {
  for (const [name, fn] of Object.entries(actions)) customActions.set(name, fn)
  scriptCache.clear()
}

/**
 * Lists the names of the available actions (built-in and registered).
 *
 * @returns sorted names
 */
export function listSettingsActions(): string[] {
  return [...new Set([...Object.keys(builtinActions), ...customActions.keys()])].sort()
}

/**
 * Translates the two historical script strings sent by the backend into the equivalent actions,
 * so they keep working without `new Function`.
 *
 * @param spec - raw spec
 * @returns `name[:argument]` spec, or `null` if it is not a known form
 */
export function mapLegacyScript(spec: string): string | null {
  const s = spec.replace(/\s+/g, '')
  if (/^\(\)=>\$q\.dark\.toggle\(\)$/.test(s)) return 'darkToggle'
  const m = /^\((\w+)\)=>Dark\.set\(\1===(['"])(\w+)\2\)$/.exec(s)
  if (m) return `darkSetWhenEquals:${m[3]}`
  return null
}

/** Cache of compiled script factories (a single `new Function` per string). */
const scriptCache = new Map<string, (...scope: unknown[]) => unknown>()

/** Messages already emitted (a single `console.warn` per unknown/malformed spec). */
const warned = new Set<string>()

/**
 * Emits a `console.warn` only once per `key`.
 *
 * @param key - deduplication key
 * @param message - warning text
 */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}

/** Clears the memory of already emitted warnings (tests only). */
export function resetSettingsWarnings(): void {
  warned.clear()
}

/**
 * Normalizes the `args` of a trigger into `{ args, params, arg }` (see {@link ISettingsActionContext}).
 *
 * @param raw - raw `args` from the schema
 * @returns context parts
 */
export function normalizeActionArgs(raw: unknown): Pick<ISettingsActionContext, 'arg' | 'args' | 'params'> {
  const isObject = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
  const args: unknown[] = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw : [raw]
  const params = isObject ? (raw as Record<string, unknown>) : {}
  const first = args[0]
  const scalar = ['string', 'number', 'boolean'].includes(typeof first)
  return { args, params, ...(scalar ? { arg: String(first) } : {}) }
}

/**
 * Resolves a spec (`name`, `name:arg`, historical form or `{ action, args }` object) into a handler.
 * Strings that do not match an action are executed as scripts only with `allowScriptStrings`;
 * object-form specs are never executed as code.
 *
 * @param spec - spec coming from the schema
 * @param opts - dependencies and mode
 * @returns handler, or `null` if it cannot be resolved
 */
export function resolveSettingsAction(spec: SettingsActionSpec, opts: IResolveActionOptions): SettingsResolvedHandler | null {
  if (typeof spec !== 'string') {
    const name = spec !== null && typeof spec === 'object' ? (spec as { action?: unknown }).action : undefined
    if (typeof name !== 'string' || !name) {
      warnOnce(`bad:${JSON.stringify(spec)}`, `Settings: unrecognized action format ${JSON.stringify(spec)} (expected a string or { action, args })`)
      return null
    }
    const handler = customActions.get(name) ?? (Object.hasOwn(builtinActions, name) ? builtinActions[name] : undefined)
    if (!handler) {
      warnOnce(`unknown:${name}`, `Settings: unknown action "${name}" (register it with registerSettingsActions)`)
      return null
    }
    const ctx: ISettingsActionContext = { ...opts.deps, ...normalizeActionArgs((spec as { args?: unknown }).args) }
    return (...args) => handler(ctx, ...args)
  }
  const normalized = mapLegacyScript(spec) ?? spec.trim()
  const m = /^([A-Za-z_]\w*)(?::(.*))?$/.exec(normalized)
  if (m) {
    const name = m[1] as string
    const handler = customActions.get(name) ?? (Object.hasOwn(builtinActions, name) ? builtinActions[name] : undefined)
    if (handler) {
      const ctx: ISettingsActionContext = { ...opts.deps, ...(m[2] !== undefined ? { arg: m[2] } : {}) }
      return (...args) => handler(ctx, ...args)
    }
  }
  if (!opts.allowScriptStrings) {
    warnOnce(`unknown:${spec}`, `Settings: unknown action "${spec}" (script strings disabled: see allowScriptStrings)`)
    return null
  }
  warnOnce(
    `script:${spec}`,
    `Settings: executing as code (new Function) the string "${spec}" coming from the backend schema (allowScriptStrings enabled: requires unsafe-eval in the CSP and trust in the backend). Prefer named actions (registerSettingsActions).`
  )
  try {
    let factory = scriptCache.get(spec)
    if (!factory) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      factory = new Function('$q', 'Dark', `return (${spec})`) as (...scope: unknown[]) => unknown
      scriptCache.set(spec, factory)
    }
    return factory(opts.deps.$q, opts.deps.Dark) as SettingsResolvedHandler
  } catch (e) {
    console.warn(`Settings: error in script "${spec}"`, e)
    return null
  }
}

/**
 * Resolves an `{ event: spec }` map into handlers, discarding the ones that cannot be resolved.
 *
 * @param map - map from the schema
 * @param opts - dependencies and mode
 * @returns `{ event: handler }` map
 */
export function resolveSettingsActions(
  map: Record<string, SettingsActionSpec> | undefined,
  opts: IResolveActionOptions,
): Record<string, SettingsResolvedHandler> {
  const out: Record<string, SettingsResolvedHandler> = {}
  if (!map) return out
  for (const [event, spec] of Object.entries(map)) {
    const handler = resolveSettingsAction(spec, opts)
    if (handler) out[event] = handler
  }
  return out
}
