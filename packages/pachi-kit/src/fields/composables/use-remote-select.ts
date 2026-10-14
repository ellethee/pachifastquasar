/**
 * module use-remote-select.ts
 *
 * Logica di selezione/filtro/creazione-al-volo dei select remoti, sopra un
 * client HTTP iniettabile (`setPachiFieldsHttp`, default il client di `@ilpachi/use-alova`): un fetch una tantum (pageSize alto, il backend
 * risponde paginato `{items,total,page,pageSize}`), un filtro client-side
 * per l'evento `@filter` di `q-select`, e una creazione "virtuale"
 * (get-or-create lato frontend, risolta per id-o-nome dal backend al save)
 * per l'evento `@new-value`.
 */
import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { getPachiFieldsHttp } from '../helpers/http'
import { resolveQuasar, showNotify } from '../helpers/quasar-instance'
import { mergeVirtualOptions, safeLabel } from '../helpers/options'
import { buildRemoteQuery, dependenciesReady, parseRemoteResponse, resolveFieldParams } from '../helpers/remote-query'
import { messages } from '../locales'
import type { IFieldDef, IFieldsState } from '../types'

export interface IRemoteSelectApi {
  /** Opzioni correntemente visibili nel select (dopo un eventuale filtro). */
  options: Ref<unknown[]>
  /** In caricamento la prima fetch delle opzioni. */
  loading: Ref<boolean>
  /** `true` se l'ultimo caricamento delle opzioni è fallito. */
  error: Ref<boolean>
  /** Handler per l'evento `@filter` di `q-select`. */
  filterFn: (val: string, update: (callbackFn: () => void) => void) => void
  /** Handler per l'evento `@new-value` di `q-select` (creazione al volo). */
  createValueFn: (val: string, done: (value: unknown, mode?: 'add' | 'add-unique' | 'toggle') => void) => void
  /** Richiede di nuovo la lista completa delle opzioni dal backend. */
  reload: () => Promise<void>
}

function getOptionLabelGetter(optionLabel: IFieldDef['optionLabel']) {
  return (item: unknown): string => {
    if (typeof optionLabel === 'function') return optionLabel(item)
    if (item === null || item === undefined) return ''
    if (typeof item === 'string') return item
    const key = optionLabel ?? 'label'
    const value = (item as Record<string, unknown>)[key]
    return value === null || value === undefined ? '' : String(value)
  }
}

/**
 * Composable per il popolamento remoto di un `q-select` a partire da un
 * `IFieldDef` con `type: 'select'` e `url` impostati. Reattivo: se `url`, `type` o `options`
 * del campo cambiano le opzioni vengono ricalcolate. Va chiamato in `setup()`.
 *
 * Il fetch è unico (`pageSize` 1000 di default, `field.pageSize` per cambiarlo): se il backend
 * dichiara più elementi di quelli ricevuti, in sviluppo viene stampato un avviso in console.
 * In caso di errore imposta `error` e mostra una notifica Quasar tradotta (it/en).
 *
 * Con `dependsOn`/`params` (e `valuesSource`) le opzioni si ricaricano al cambio dei valori da cui
 * dipendono; finché una dipendenza è vuota non si carica nulla e le opzioni sono vuote.
 *
 * @param fieldSource - definizione del campo (valore, ref o getter)
 * @param valuesSource - valori correnti della sezione, per `dependsOn`/`params` (valore, ref o getter)
 */
export function useRemoteSelect(
  fieldSource: MaybeRefOrGetter<IFieldDef>,
  valuesSource?: MaybeRefOrGetter<IFieldsState | undefined>,
): IRemoteSelectApi {
  const field = (): IFieldDef => toValue(fieldSource)
  const values = (): IFieldsState => toValue(valuesSource) ?? {}
  const optionValue = (): string => (field().optionValue as string) ?? 'value'
  const getLabel = (item: unknown): string => safeLabel(getOptionLabelGetter(field().optionLabel), item)

  const allOptions = ref<unknown[]>([...(field().options ?? [])])
  const options = ref<unknown[]>(allOptions.value)
  const loading = ref(false)
  const error = ref(false)
  // opzioni "virtuali" create al volo: sopravvivono a ricalcoli/ricaricamenti finché lo scope (url/params) non cambia
  let virtualOptions: unknown[] = []
  let scopeKey = ''
  const { t } = usePachiI18n(messages)
  // $q dell'app risolto in setup (indipendente dalla copia di quasar vista dal package)
  const $q = resolveQuasar()
  let requestId = 0

  function notifyError(): void {
    try {
      showNotify($q, {
        type: 'negative',
        message: t('pachiEditDialogFields.loadError', { label: field().label ?? field().field }),
      })
    } catch {
      // plugin Notify non installato: resta lo stato `error`
    }
  }

  async function reload(): Promise<void> {
    const current = field()
    if (!current.url) return
    if (!dependenciesReady(current, values())) {
      requestId++
      loading.value = false
      error.value = false
      allOptions.value = []
      options.value = allOptions.value
      return
    }
    const id = ++requestId
    loading.value = true
    error.value = false
    try {
      // client risolto qui (lazy): i form senza select remoti non richiedono alcun client HTTP
      const http = getPachiFieldsHttp()
      const query = buildRemoteQuery(current, values())
      const parsed = parseRemoteResponse(await http.get<unknown>(current.url, query))
      if (id !== requestId) return
      if (
        import.meta.env?.DEV &&
        (parsed.total ?? 0) > parsed.items.length
      ) {
        console.warn(
          `[pachi-kit/fields] "${current.field}": ricevuti ${parsed.items.length} elementi su ${parsed.total} (pageSize ${query.pageSize}): opzioni troncate, usa field.pageSize.`,
        )
      }
      allOptions.value = mergeVirtualOptions(parsed.items, virtualOptions, optionValue())
      options.value = allOptions.value
    } catch (err) {
      if (id !== requestId) return
      if (import.meta.env?.DEV) {
        console.error(`[pachi-kit/fields] "${current.field}": caricamento opzioni fallito`, err)
      }
      error.value = true
      notifyError()
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  watch(
    () =>
      [
        field().type,
        field().url,
        field().options,
        // dipendenze/params: serializzati per ricaricare solo quando il risultato cambia davvero
        JSON.stringify(resolveFieldParams(field(), values())),
        dependenciesReady(field(), values()),
      ] as const,
    () => {
      const key = JSON.stringify([field().type, field().url, resolveFieldParams(field(), values()), dependenciesReady(field(), values())])
      if (key !== scopeKey) virtualOptions = []
      scopeKey = key
      allOptions.value = mergeVirtualOptions([...(field().options ?? [])], virtualOptions, optionValue())
      options.value = allOptions.value
      if (field().type === 'select' && field().url) void reload()
    },
    { immediate: true },
  )

  function filterFn(val: string, update: (callbackFn: () => void) => void) {
    update(() => {
      const needle = val.trim().toLowerCase()
      options.value = needle
        ? allOptions.value.filter((item) => getLabel(item).toLowerCase().includes(needle))
        : allOptions.value
    })
  }

  function createValueFn(val: string, done: (value: unknown, mode?: 'add' | 'add-unique' | 'toggle') => void) {
    const needle = val.trim()
    if (!needle) {
      done(null)
      return
    }
    const found = allOptions.value.find((item) => getLabel(item).toLowerCase() === needle.toLowerCase())
    if (found) {
      // DynamicField usa emitValue+mapOptions: il valore passato a `done()` diventa
      // direttamente il model, senza ulteriore mappatura — qui l'id dell'opzione trovata.
      done(getOptionValueOf(found), 'add-unique')
      return
    }
    // Nessuna opzione esistente corrisponde al testo digitato: il backend (es. un campo `int|str|RelatedRef`) risolve il get-or-create per nome dal valore
    // stringa grezzo. Si registra comunque un'opzione "virtuale" per poterla ri-selezionare
    // senza doverla ridigitare, con optionValue coincidente col testo digitato.
    const optionLabelKey = typeof field().optionLabel === 'string' ? (field().optionLabel as string) : 'label'
    const virtual = { [optionValue()]: needle, [optionLabelKey]: needle }
    virtualOptions = [...virtualOptions, virtual]
    allOptions.value = [...allOptions.value, virtual]
    options.value = allOptions.value
    done(needle, 'add-unique')
  }

  function getOptionValueOf(item: unknown): unknown {
    if (item === null || typeof item !== 'object') return item
    return (item as Record<string, unknown>)[optionValue()]
  }

  return { options, loading, error, filterFn, createValueFn, reload }
}
