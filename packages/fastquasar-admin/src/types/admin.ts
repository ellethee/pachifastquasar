/** Primary key value of a row (int, uuid or string). */
export type AdminPk = number | string

/** Row of a model: camelCase keys as in the schema. */
export type AdminRow = Record<string, unknown>

/** Permissions of the current user on a model. */
export interface IAdminPermissions {
  view: boolean
  add: boolean
  change: boolean
  delete: boolean
}

/** Entry of `GET /admin/models`. */
export interface IAdminModelInfo {
  app: string
  model: string
  title: string
  titleKey?: string
  permissions: IAdminPermissions
}

/** Control of a field (`fields.<name>.component`). */
export type AdminComponentName =
  | 'input'
  | 'textarea'
  | 'number'
  | 'toggle'
  | 'select'
  | 'date'
  | 'datetime'
  | 'time'
  | 'json'
  | 'lookup'

/** Value type of a field (`fields.<name>.type`). */
export type AdminFieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'json'

/** Option of a `select` field. */
export interface IAdminOption {
  label: string
  value: unknown
}

/** Control properties (`properties`). */
export interface IAdminFieldProperties {
  options?: IAdminOption[]
  emitValue?: boolean
  mapOptions?: boolean
  min?: number
  max?: number
  /** `'any'` or a number. */
  step?: number | 'any'
  [key: string]: unknown
}

/** Reference to a registered model (`lookup` fields). */
export interface IAdminLookup {
  app: string
  model: string
}

/** Schema field. */
export interface IAdminField {
  component: AdminComponentName
  type: AdminFieldType
  default?: unknown
  label: string
  labelKey?: string
  required?: boolean
  readonly?: boolean
  nullable?: boolean
  primaryKey?: boolean
  maxlength?: number
  properties?: IAdminFieldProperties
  /** Message keys for the option labels: `{ <value>: 'admin.x.y.options.v' }`. */
  optionKeys?: Record<string, string>
  lookup?: IAdminLookup
}

/** List filter. */
export interface IAdminFilter {
  field: string
  component: AdminComponentName
  label: string
  labelKey?: string
  properties?: IAdminFieldProperties
  optionKeys?: Record<string, string>
  lookup?: IAdminLookup
  /** Range filter: `<field>__gte` and `<field>__lte` parameters. */
  range?: boolean
}

/** Bulk action. */
export interface IAdminAction {
  name: string
  label: string
  labelKey?: string
  permission?: string
  confirm?: boolean
  allowed?: boolean
}

/** List configuration. */
export interface IAdminListConfig {
  display: string[]
  search: boolean
  /** Default ordering: `['-id']`. */
  ordering: string[]
  orderFields: string[]
  filters: IAdminFilter[]
}

/** Schema of a model (`GET .../_schema`). */
export interface IAdminSchema {
  app: string
  model: string
  title: string
  titleKey?: string
  primaryKey: string
  primaryKeyType: 'int' | 'uuid' | 'str'
  permissions: IAdminPermissions
  list: IAdminListConfig
  fields: Record<string, IAdminField>
  actions: IAdminAction[]
  history: boolean
}

/** Paginated response. */
export interface IAdminPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}

/** `_options` item (lookup). */
export interface IAdminLookupOption {
  value: AdminPk
  label: string
}

/** Result of a bulk action. */
export interface IAdminActionResult {
  affected: number
  message?: string
}

/** History entry. */
export interface IAdminHistoryEntry {
  id: AdminPk
  timestamp: string
  userId?: AdminPk | null
  username?: string | null
  /** `add`, `change`, `delete` or `action:<name>`. */
  action: string
  changes?: Record<string, { old?: unknown, new?: unknown }>
}
