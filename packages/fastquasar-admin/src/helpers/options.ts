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

/** Context passed to a cell formatter. */
export interface IAdminFormatContext {
  /** Raw value of the cell. */
  value: unknown
  /** Full row. */
  row: AdminRow
  /** Field name (camelCase). */
  name: string
  field: IAdminField
  schema: IAdminSchema
  /** Active language (e.g. `it`). */
  locale: string
  /** Text the package would have shown (default formatting). */
  defaultText: string
}

/** Cell formatter: returns the text to show. */
export type AdminFormatter = (ctx: IAdminFormatContext) => string

/** Global package options (to be set once at startup with `setPachiAdminOptions`). */
export interface IPachiAdminOptions {
  /**
   * Returns the HTTP client given the base URL (`basePath`). Default: the client of the global instance of
   * `@ilpachi/use-alova` (registered by `createPachiApp`, with auth and error handling).
   */
  getHttp?: ((basePath: string) => IPachiAdminHttp) | undefined
  /** Prefix of the Admin APIs. Default `/api/admin/models`. */
  basePath?: string
  /**
   * Replacement components for the form controls. Key: full field name `app.model.field`, or the control
   * name (`input`, `number`, `select`, ...). The component receives `modelValue`, `field`, `name`,
   * `label`, `readonly`, `error`, `schema` and emits `update:modelValue`. The per-field key wins.
   */
  components?: Record<string, Component> | undefined
  /**
   * Table cell formatters. Key: `app.model.field` or a type (`date`, `boolean`, `json`, ...).
   * The per-field key wins.
   */
  formatters?: Record<string, AdminFormatter> | undefined
  /**
   * Texts replacing those of the schema, by backend message key
   * (e.g. `admin.demo.item.title`) or by full field name. They take precedence over translations.
   */
  labels?: Record<string, string> | undefined
  /** Models to hide: list of `app.model` or predicate. */
  hideModels?: string[] | ((model: IAdminModelInfo) => boolean) | undefined
}

/** Options with defaults applied. */
export interface IResolvedAdminOptions {
  getHttp: ((basePath: string) => IPachiAdminHttp) | undefined
  basePath: string
  components: Record<string, Component>
  formatters: Record<string, AdminFormatter>
  labels: Record<string, string>
  hideModels: string[] | ((model: IAdminModelInfo) => boolean)
}

/** @returns the default options */
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
 * Configures the package. `components`, `formatters` and `labels` are MERGED with what is already registered;
 * the other options replace the previous value. To be called once at startup (boot file).
 *
 * @param opts - partial options
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
 * Current options.
 *
 * @returns complete options
 */
export function getPachiAdminOptions(): IResolvedAdminOptions {
  const state = sharedState()
  return (state.options ??= defaults())
}

/** Restores the defaults (for tests). */
export function resetPachiAdminOptions(): void {
  sharedState().options = defaults()
}

/**
 * Tells whether a model is hidden by the options.
 *
 * @param model - entry of the model list
 * @returns `true` if it must be hidden
 */
export function isModelHidden(model: IAdminModelInfo): boolean {
  const hide = getPachiAdminOptions().hideModels
  if (typeof hide === 'function') return hide(model)
  return hide.includes(`${model.app}.${model.model}`)
}

/**
 * Formatter registered for a field (per field, then per type).
 *
 * @param key - `app.model.field`
 * @param type - field type
 * @returns the formatter, if any
 */
export function findFormatter(key: string, type: AdminFieldType): AdminFormatter | undefined {
  const { formatters } = getPachiAdminOptions()
  return formatters[key] ?? formatters[type]
}

/**
 * Replacement component registered for a field (per field, then per control type).
 *
 * @param key - `app.model.field`
 * @param component - schema control name
 * @returns the component, if any
 */
export function findComponent(key: string, component: string): Component | undefined {
  const { components } = getPachiAdminOptions()
  return components[key] ?? components[component]
}
