/** Valore della chiave primaria di una riga (int, uuid o stringa). */
export type AdminPk = number | string

/** Riga di un modello: chiavi camelCase come nello schema. */
export type AdminRow = Record<string, unknown>

/** Permessi dell'utente corrente su un modello. */
export interface IAdminPermissions {
  view: boolean
  add: boolean
  change: boolean
  delete: boolean
}

/** Voce di `GET /admin/models`. */
export interface IAdminModelInfo {
  app: string
  model: string
  title: string
  titleKey?: string
  permissions: IAdminPermissions
}

/** Controllo di un campo (`fields.<nome>.component`). */
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

/** Tipo del valore di un campo (`fields.<nome>.type`). */
export type AdminFieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'json'

/** Opzione di un campo `select`. */
export interface IAdminOption {
  label: string
  value: unknown
}

/** Proprietà del controllo (`properties`). */
export interface IAdminFieldProperties {
  options?: IAdminOption[]
  emitValue?: boolean
  mapOptions?: boolean
  min?: number
  max?: number
  /** `'any'` o un numero. */
  step?: number | 'any'
  [key: string]: unknown
}

/** Riferimento a un modello registrato (campi `lookup`). */
export interface IAdminLookup {
  app: string
  model: string
}

/** Campo dello schema. */
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
  /** Chiavi di messaggio per le etichette delle opzioni: `{ <valore>: 'admin.x.y.options.v' }`. */
  optionKeys?: Record<string, string>
  lookup?: IAdminLookup
}

/** Filtro della lista. */
export interface IAdminFilter {
  field: string
  component: AdminComponentName
  label: string
  labelKey?: string
  properties?: IAdminFieldProperties
  optionKeys?: Record<string, string>
  lookup?: IAdminLookup
  /** Filtro a intervallo: parametri `<campo>__gte` e `<campo>__lte`. */
  range?: boolean
}

/** Azione in blocco. */
export interface IAdminAction {
  name: string
  label: string
  labelKey?: string
  permission?: string
  confirm?: boolean
  allowed?: boolean
}

/** Configurazione della lista. */
export interface IAdminListConfig {
  display: string[]
  search: boolean
  /** Ordinamento di default: `['-id']`. */
  ordering: string[]
  orderFields: string[]
  filters: IAdminFilter[]
}

/** Schema di un modello (`GET .../_schema`). */
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

/** Risposta paginata. */
export interface IAdminPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}

/** Elemento di `_options` (lookup). */
export interface IAdminLookupOption {
  value: AdminPk
  label: string
}

/** Risultato di un'azione in blocco. */
export interface IAdminActionResult {
  affected: number
  message?: string
}

/** Voce di cronologia. */
export interface IAdminHistoryEntry {
  id: AdminPk
  timestamp: string
  userId?: AdminPk | null
  username?: string | null
  /** `add`, `change`, `delete` oppure `action:<nome>`. */
  action: string
  changes?: Record<string, { old?: unknown, new?: unknown }>
}
