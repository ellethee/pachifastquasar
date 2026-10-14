import type { Component } from 'vue'
import type {
  AdminFieldType,
  AdminRow,
  IAdminField,
  IAdminModelInfo,
  IAdminSchema,
} from '../types/admin'
import { DEFAULT_BASE_PATH } from './http'
import { sharedState } from './shared-state'
import type { IPachiAdminHttp } from './http'

/** Contesto passato a un formatter di cella. */
export interface IAdminFormatContext {
  /** Valore grezzo della cella. */
  value: unknown
  /** Riga completa. */
  row: AdminRow
  /** Nome del campo (camelCase). */
  name: string
  field: IAdminField
  schema: IAdminSchema
  /** Lingua attiva (es. `it`). */
  locale: string
  /** Testo che il package avrebbe mostrato (formattazione predefinita). */
  defaultText: string
}

/** Formatter di cella: restituisce il testo da mostrare. */
export type AdminFormatter = (ctx: IAdminFormatContext) => string

/** Opzioni globali del package (da impostare una volta all'avvio con `setPachiAdminOptions`). */
export interface IPachiAdminOptions {
  /**
   * Restituisce il client HTTP in funzione della base URL (`basePath`). Default: il client dell'istanza globale di
   * `@ilpachi/use-alova` (registrata da `createPachiApp`, con auth e gestione errori).
   */
  getHttp?: ((basePath: string) => IPachiAdminHttp) | undefined
  /** Prefisso delle API Admin. Default `/api/admin/models`. */
  basePath?: string
  /**
   * Componenti sostitutivi dei controlli del form. Chiave: nome del campo completo `app.model.campo`, oppure il
   * nome del controllo (`input`, `number`, `select`, ...). Il componente riceve `modelValue`, `field`, `name`,
   * `label`, `readonly`, `error`, `schema` ed emette `update:modelValue`. Vince la chiave per campo.
   */
  components?: Record<string, Component> | undefined
  /**
   * Formatter delle celle della tabella. Chiave: `app.model.campo` oppure un tipo (`date`, `boolean`, `json`, ...).
   * Vince la chiave per campo.
   */
  formatters?: Record<string, AdminFormatter> | undefined
  /**
   * Testi che sostituiscono quelli dello schema, per chiave di messaggio del backend
   * (es. `admin.demo.item.title`) o per nome completo di campo. Hanno la precedenza sulle traduzioni.
   */
  labels?: Record<string, string> | undefined
  /** Modelli da nascondere: elenco di `app.model` oppure predicato. */
  hideModels?: string[] | ((model: IAdminModelInfo) => boolean) | undefined
}

/** Opzioni con i default applicati. */
export interface IResolvedAdminOptions {
  getHttp: ((basePath: string) => IPachiAdminHttp) | undefined
  basePath: string
  components: Record<string, Component>
  formatters: Record<string, AdminFormatter>
  labels: Record<string, string>
  hideModels: string[] | ((model: IAdminModelInfo) => boolean)
}

/** @returns le opzioni di default */
function defaults(): IResolvedAdminOptions {
  return {
    getHttp: undefined,
    basePath: DEFAULT_BASE_PATH,
    components: {},
    formatters: {},
    labels: {},
    hideModels: [],
  }
}

/**
 * Configura il package. `components`, `formatters` e `labels` si UNISCONO a quanto già registrato; le altre opzioni
 * sostituiscono il valore precedente. Da chiamare una volta all'avvio (boot file).
 *
 * @param opts - opzioni parziali
 */
export function setPachiAdminOptions(opts: IPachiAdminOptions): void {
  const options = getPachiAdminOptions()
  sharedState().options = {
    getHttp: 'getHttp' in opts ? opts.getHttp : options.getHttp,
    basePath: (opts.basePath ?? options.basePath).replace(/\/+$/, ''),
    components: { ...options.components, ...opts.components },
    formatters: { ...options.formatters, ...opts.formatters },
    labels: { ...options.labels, ...opts.labels },
    hideModels: opts.hideModels ?? options.hideModels,
  }
}

/**
 * Opzioni correnti.
 *
 * @returns opzioni complete
 */
export function getPachiAdminOptions(): IResolvedAdminOptions {
  const state = sharedState()
  return (state.options ??= defaults())
}

/** Ripristina i default (per i test). */
export function resetPachiAdminOptions(): void {
  sharedState().options = defaults()
}

/**
 * Indica se un modello è nascosto dalle opzioni.
 *
 * @param model - voce dell'elenco modelli
 * @returns `true` se va nascosto
 */
export function isModelHidden(model: IAdminModelInfo): boolean {
  const hide = getPachiAdminOptions().hideModels
  if (typeof hide === 'function') return hide(model)
  return hide.includes(`${model.app}.${model.model}`)
}

/**
 * Formatter registrato per un campo (per campo, poi per tipo).
 *
 * @param key - `app.model.campo`
 * @param type - tipo del campo
 * @returns il formatter, se esiste
 */
export function findFormatter(key: string, type: AdminFieldType): AdminFormatter | undefined {
  const { formatters } = getPachiAdminOptions()
  return formatters[key] ?? formatters[type]
}

/**
 * Componente sostitutivo registrato per un campo (per campo, poi per tipo di controllo).
 *
 * @param key - `app.model.campo`
 * @param component - nome del controllo dello schema
 * @returns il componente, se esiste
 */
export function findComponent(key: string, component: string): Component | undefined {
  const { components } = getPachiAdminOptions()
  return components[key] ?? components[component]
}
