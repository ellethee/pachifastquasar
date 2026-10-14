/** Dipendenze passate alle azioni (iniettate dal chiamante: il modulo non importa Quasar). */
export interface ISettingsActionDeps {
  /** Plugin `Dark` di Quasar (o un suo sostituto nei test). */
  Dark?: { set: (v: boolean | 'auto') => void; toggle: () => void }
  /** Plugin `Notify` di Quasar. */
  Notify?: { create: (opts: { message: string; type?: string }) => unknown }
  /** Istanza `$q` (solo per il fallback con stringhe di script). */
  $q?: unknown
}

/**
 * Trigger di `events`/`watch` come arriva dallo schema: stringa legacy (`nome`, `nome:arg`, script storico)
 * oppure oggetto `{ action, args }` (formato di pachifast; `args` è un oggetto JSON, ma sono accettati anche
 * un array o un valore singolo).
 */
export type SettingsActionSpec = string | { action: string; args?: unknown }

/** Contesto ricevuto da un'azione. */
export interface ISettingsActionContext extends ISettingsActionDeps {
  /**
   * Argomento testuale: la parte dopo `:` della stringa `nome:argomento`, oppure (forma oggetto) il primo
   * argomento scalare (valore singolo o primo elemento di un array), convertito in stringa.
   */
  arg?: string
  /** Argomenti dichiarati dallo schema normalizzati in array (`undefined` -> `[]`, valore singolo -> `[valore]`). */
  args?: unknown[]
  /** Argomenti con nome (`args` di pachifast, es. `{ mode: 'dark' }`); `{}` se `args` non è un oggetto. */
  params?: Record<string, unknown>
}

/** Handler di un'azione: riceve il contesto e gli argomenti dell'evento (per `watch`, il nuovo valore). */
export type SettingsActionHandler = (ctx: ISettingsActionContext, ...args: unknown[]) => unknown

/** Handler di un evento/watch già risolto. */
export type SettingsResolvedHandler = (...args: unknown[]) => unknown

/** Opzioni di risoluzione di una specifica. */
export interface IResolveActionOptions {
  /** Dipendenze iniettate nelle azioni. */
  deps: ISettingsActionDeps
  /** Abilita il fallback `new Function` sulle stringhe di script (default false). */
  allowScriptStrings?: boolean
}

/** Azioni predefinite (whitelist). */
const builtinActions: Record<string, SettingsActionHandler> = {
  /** Alterna il tema scuro/chiaro. */
  darkToggle: ({ Dark }) => Dark?.toggle(),
  /** Imposta il tema scuro: `arg` (`dark`/`light`/`auto`) oppure il valore dell'evento (booleano o stringa). */
  darkSet: ({ Dark, arg, params }, value) => {
    const v = arg ?? params?.mode ?? value
    Dark?.set(v === 'auto' ? 'auto' : v === 'dark' || v === true)
  },
  /** Imposta il tema scuro quando il valore dell'evento è uguale a `arg` (default `dark`). */
  darkSetWhenEquals: ({ Dark, arg, params }, value) => Dark?.set(value === (arg ?? params?.value ?? 'dark')),
  /** Mostra una notifica con il testo `arg`. */
  notify: ({ Notify, arg, params }) => Notify?.create({ message: arg ?? String(params?.message ?? '') }),
}

const customActions = new Map<string, SettingsActionHandler>()

/**
 * Registra azioni nominate dell'app, utilizzabili nei campi `events`/`watch` dello schema
 * (es. `"events": { "update:modelValue": "refreshMenu" }`). Sovrascrivono quelle predefinite.
 *
 * @param actions - mappa nome azione -> handler
 */
export function registerSettingsActions(actions: Record<string, SettingsActionHandler>): void {
  for (const [name, fn] of Object.entries(actions)) customActions.set(name, fn)
  scriptCache.clear()
}

/**
 * Elenca i nomi delle azioni disponibili (predefinite e registrate).
 *
 * @returns nomi ordinati
 */
export function listSettingsActions(): string[] {
  return [...new Set([...Object.keys(builtinActions), ...customActions.keys()])].sort()
}

/**
 * Traduce le due stringhe di script storiche inviate dal backend nelle azioni equivalenti,
 * così continuano a funzionare senza `new Function`.
 *
 * @param spec - specifica grezza
 * @returns specifica `nome[:argomento]` oppure `null` se non è una forma nota
 */
export function mapLegacyScript(spec: string): string | null {
  const s = spec.replace(/\s+/g, '')
  if (/^\(\)=>\$q\.dark\.toggle\(\)$/.test(s)) return 'darkToggle'
  const m = /^\((\w+)\)=>Dark\.set\(\1===(['"])(\w+)\2\)$/.exec(s)
  if (m) return `darkSetWhenEquals:${m[3]}`
  return null
}

/** Cache delle factory di script compilate (una sola `new Function` per stringa). */
const scriptCache = new Map<string, (...scope: unknown[]) => unknown>()

/** Messaggi già emessi (un solo `console.warn` per specifica sconosciuta/malformata). */
const warned = new Set<string>()

/**
 * Emette un `console.warn` una sola volta per `key`.
 *
 * @param key - chiave di deduplica
 * @param message - testo del warning
 */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}

/** Azzera la memoria dei warning già emessi (solo per i test). */
export function resetSettingsWarnings(): void {
  warned.clear()
}

/**
 * Normalizza gli `args` di un trigger in `{ args, params, arg }` (vedi {@link ISettingsActionContext}).
 *
 * @param raw - `args` grezzi dallo schema
 * @returns parti del contesto
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
 * Risolve una specifica (`nome`, `nome:arg`, forma storica oppure oggetto `{ action, args }`) in un handler.
 * Le stringhe che non corrispondono a un'azione sono eseguite come script solo con `allowScriptStrings`;
 * le specifiche in forma oggetto non sono mai eseguite come codice.
 *
 * @param spec - specifica proveniente dallo schema
 * @param opts - dipendenze e modalità
 * @returns handler, oppure `null` se non risolvibile
 */
export function resolveSettingsAction(spec: SettingsActionSpec, opts: IResolveActionOptions): SettingsResolvedHandler | null {
  if (typeof spec !== 'string') {
    const name = spec !== null && typeof spec === 'object' ? (spec as { action?: unknown }).action : undefined
    if (typeof name !== 'string' || !name) {
      warnOnce(`bad:${JSON.stringify(spec)}`, `Settings: formato di azione non riconosciuto ${JSON.stringify(spec)} (atteso una stringa o { action, args })`)
      return null
    }
    const handler = customActions.get(name) ?? (Object.hasOwn(builtinActions, name) ? builtinActions[name] : undefined)
    if (!handler) {
      warnOnce(`unknown:${name}`, `Settings: azione "${name}" sconosciuta (registrala con registerSettingsActions)`)
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
    warnOnce(`unknown:${spec}`, `Settings: azione "${spec}" sconosciuta (stringhe di script disabilitate: vedi allowScriptStrings)`)
    return null
  }
  warnOnce(
    `script:${spec}`,
    `Settings: esecuzione come codice (new Function) della stringa "${spec}" proveniente dallo schema del backend (allowScriptStrings attivo: richiede unsafe-eval nella CSP e fiducia nel backend). Preferire azioni nominate (registerSettingsActions).`
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
    console.warn(`Settings: errore nello script "${spec}"`, e)
    return null
  }
}

/**
 * Risolve una mappa `{ evento: specifica }` in handler, scartando quelli non risolvibili.
 *
 * @param map - mappa dallo schema
 * @param opts - dipendenze e modalità
 * @returns mappa `{ evento: handler }`
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
