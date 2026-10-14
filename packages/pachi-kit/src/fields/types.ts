/**
 * module types.ts
 *
 * Vocabolario dichiarativo dei campi per il form field-driven di
 * `@ilpachi/pachi-kit/fields`.
 */

/**
 * Tipo di campo renderizzato da {@link ./components/DynamicField.vue}.
 * - `text` (default): `q-input` semplice.
 * - `textarea`: `q-input` con `type="textarea"`.
 * - `select`: `q-select`, locale (da `field.options`) o remoto (da `field.url`).
 * - `pdate`: data/ora via `PachiDatePicker` (`@ilpachi/pachi-kit/ui`).
 * - `number`: `q-input` con `type="number"`; il valore emesso è un `number` (o `null` se vuoto).
 * - `boolean`: `q-toggle`.
 * Con `component` (un componente Vue) il tipo è ignorato e si renderizza quel componente
 * (v-model + tutte le altre chiavi come prop): è così che si usano `FlagsInput`/`EnumSelect`.
 */
// `(string & {})` mantiene l'autocompletamento dei tipi noti senza collassare l'unione a `string`
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type IFieldType = 'text' | 'textarea' | 'select' | 'pdate' | 'number' | 'boolean' | (string & {})

/**
 * Definizione dichiarativa di un singolo campo del form, con lo stesso
 * vocabolario dichiarativo: `field`, `label`, `type`, `url`,
 * `optionLabel`, `optionValue`, `multiple`, `useChips`, `clearable`,
 * `autogrow`, `useInput`, `mask`, ecc. Qualunque chiave non riservata viene
 * passata pari pari (v-bind) al componente Quasar sottostante.
 */
export interface IFieldDef {
  /** Nome della proprietà nello stato della sezione (es. 'nome', 'autore'). */
  field: string
  /** Etichetta visualizzata (prop `label` del componente sottostante). */
  label: string
  /** Componente Vue custom da renderizzare al posto dei tipi standard (v-model + altre chiavi come prop). */
  component?: unknown
  /** Tipo di campo, vedi {@link IFieldType}. Default: 'text'. */
  type?: IFieldType
  /** URL dell'endpoint REST paginato per un select remoto (es. '/api/genere'). */
  url?: string
  /** Opzioni statiche per un select locale (alternativa a `url`). */
  options?: unknown[]
  /** Chiave (o funzione estrattore) per l'etichetta delle opzioni di un select. Default 'label'. */
  optionLabel?: string | ((item: unknown) => string)
  /** Chiave per il valore delle opzioni di un select. Default 'value'. */
  optionValue?: string
  /** Select a selezione multipla (es. tag). */
  multiple?: boolean
  /** Mostra i valori selezionati come chips (Quasar `use-chips`). */
  useChips?: boolean
  /** Mostra l'icona per svuotare il campo. */
  clearable?: boolean
  /** Textarea che si espande in altezza col contenuto. */
  autogrow?: boolean
  /** Abilita l'input testuale di ricerca/filtro nel select. */
  useInput?: boolean
  /** Maschera data/ora per il tipo 'pdate' (es. 'YYYY-MM-DD'). */
  mask?: string
  /** `pageSize` richiesto al backend per un select remoto (default 1000, una sola fetch senza paginazione). */
  pageSize?: number
  /** Campo obbligatorio: valida in `validate()` e marca la UI (asterisco e regola Quasar). */
  required?: boolean
  /** Testo di aiuto sotto il campo. */
  hint?: string
  /** Regole di validazione Quasar (`(val) => true | string`). */
  rules?: ((val: unknown) => boolean | string)[]
  /**
   * Nome (o nomi) dei campi della stessa sezione da cui questo campo dipende (es. `'countryId'`).
   * Per un select remoto: finché una dipendenza è vuota (`null`, `undefined`, `''`, array vuoto)
   * non si carica nulla (opzioni vuote); al cambio di una dipendenza le opzioni vengono ricaricate
   * (con `params` riletto) e, salvo `resetOnDependencyChange: false`, il valore del campo viene azzerato.
   * Richiede `FieldsSection` (o il prop `values` di `DynamicField`).
   */
  dependsOn?: string | string[]
  /**
   * Query param aggiuntivi della GET delle opzioni di un select remoto: un oggetto fisso oppure una
   * funzione dei valori correnti della sezione, riletta a ogni cambio dei valori che usa
   * (es. `(v) => ({ countryId: v.countryId })`). I valori `null`/`undefined`/`''` vengono omessi.
   * Senza `params`, per i campi con `dependsOn` si inviano le dipendenze come `<campo>=<valore>`.
   */
  params?: Record<string, unknown> | ((values: IFieldsState) => Record<string, unknown>)
  /** Con `dependsOn`: azzera il valore quando una dipendenza cambia (default `true`). */
  resetOnDependencyChange?: boolean
  /** Qualsiasi altra prop Quasar (class, style, clearable, dense, ecc.) passa pari pari. */
  [key: string]: unknown
}

/** Una riga del form: uno o più campi affiancati sulla stessa riga (layout a griglia). */
export type IFieldRow = IFieldDef[]

/** Stato generico di una sezione field-driven: un record chiave→valore dei campi. */
export type IFieldsState = Record<string, unknown>
