/**
 * module types.ts
 *
 * Declarative field vocabulary for the field-driven form of
 * `@ilpachi/pachi-kit/fields`.
 */

/**
 * Field type rendered by {@link ./components/DynamicField.vue}.
 * - `text` (default): plain `q-input`.
 * - `textarea`: `q-input` with `type="textarea"`.
 * - `select`: `q-select`, local (from `field.options`) or remote (from `field.url`).
 * - `pdate`: date/time via `PachiDatePicker` (`@ilpachi/pachi-kit/ui`).
 * - `number`: `q-input` with `type="number"`; the emitted value is a `number` (or `null` when empty).
 * - `boolean`: `q-toggle`.
 * With `component` (a Vue component) the type is ignored and that component is rendered
 * (v-model + all other keys as props): this is how you use `FlagsInput`/`EnumSelect`.
 */
// `(string & {})` keeps autocompletion of the known types without collapsing the union to `string`
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type IFieldType = 'text' | 'textarea' | 'select' | 'pdate' | 'number' | 'boolean' | (string & {})

/**
 * Declarative definition of a single form field, with the keys: `field`, `label`, `type`, `url`,
 * `optionLabel`, `optionValue`, `multiple`, `useChips`, `clearable`,
 * `autogrow`, `useInput`, `mask`, etc. Any non-reserved key is
 * passed through as is (v-bind) to the underlying Quasar component.
 */
export interface IFieldDef {
  /** Name of the property in the section state (e.g. 'name', 'author'). */
  field: string
  /** Displayed label (`label` prop of the underlying component). */
  label: string
  /** Custom Vue component rendered instead of the standard types (v-model + other keys as props). */
  component?: unknown
  /** Field type, see {@link IFieldType}. Default: 'text'. */
  type?: IFieldType
  /** URL of the paginated REST endpoint for a remote select (e.g. '/api/genre'). */
  url?: string
  /** Static options for a local select (alternative to `url`). */
  options?: unknown[]
  /** Key (or extractor function) for the label of a select's options. Default 'label'. */
  optionLabel?: string | ((item: unknown) => string)
  /** Key for the value of a select's options. Default 'value'. */
  optionValue?: string
  /** Multiple-selection select (e.g. tags). */
  multiple?: boolean
  /** Show the selected values as chips (Quasar `use-chips`). */
  useChips?: boolean
  /** Show the icon to clear the field. */
  clearable?: boolean
  /** Textarea that grows in height with its content. */
  autogrow?: boolean
  /** Enable the text search/filter input in the select. */
  useInput?: boolean
  /** Date/time mask for the 'pdate' type (e.g. 'YYYY-MM-DD'). */
  mask?: string
  /** `pageSize` requested from the backend for a remote select (default 1000, a single fetch without pagination). */
  pageSize?: number
  /** Required field: validated in `validate()` and marked in the UI (asterisk and Quasar rule). */
  required?: boolean
  /** Help text under the field. */
  hint?: string
  /** Quasar validation rules (`(val) => true | string`). */
  rules?: ((val: unknown) => boolean | string)[]
  /**
   * Name (or names) of the fields in the same section this field depends on (e.g. `'countryId'`).
   * For a remote select: while a dependency is empty (`null`, `undefined`, `''`, empty array)
   * nothing is loaded (empty options); when a dependency changes the options are reloaded
   * (with `params` re-evaluated) and, unless `resetOnDependencyChange: false`, the field value is cleared.
   * Requires `FieldsSection` (or the `values` prop of `DynamicField`).
   */
  dependsOn?: string | string[]
  /**
   * Extra query params of the options GET of a remote select: a fixed object or a
   * function of the section's current values, re-evaluated whenever the values it uses change
   * (e.g. `(v) => ({ countryId: v.countryId })`). `null`/`undefined`/`''` values are omitted.
   * Without `params`, for fields with `dependsOn` the dependencies are sent as `<field>=<value>`.
   */
  params?: Record<string, unknown> | ((values: IFieldsState) => Record<string, unknown>)
  /** With `dependsOn`: clear the value when a dependency changes (default `true`). */
  resetOnDependencyChange?: boolean
  /** Any other Quasar prop (class, style, clearable, dense, etc.) is passed through as is. */
  [key: string]: unknown
}

/** A form row: one or more fields side by side on the same row (grid layout). */
export type IFieldRow = IFieldDef[]

/** Generic state of a field-driven section: a key→value record of the fields. */
export type IFieldsState = Record<string, unknown>
