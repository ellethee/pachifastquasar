/**
 * module use-remote-select.ts
 *
 * Selection/filter/on-the-fly-creation logic of remote selects, on top of an
 * injectable HTTP client (`setPachiFieldsHttp`, default the `@ilpachi/use-alova` client): a one-off fetch (high pageSize, the backend
 * answers paginated `{items,total,page,pageSize}`), a client-side filter
 * for the `@filter` event of `q-select`, and a "virtual" creation
 * (frontend get-or-create, resolved by id-or-name by the backend on save)
 * for the `@new-value` event.
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
  /** Options currently visible in the select (after any filter). */
  options: Ref<unknown[]>
  /** The first fetch of the options is loading. */
  loading: Ref<boolean>
  /** `true` if the last options load failed. */
  error: Ref<boolean>
  /** Handler for the `@filter` event of `q-select`. */
  filterFn: (val: string, update: (callbackFn: () => void) => void) => void
  /** Handler for the `@new-value` event of `q-select` (on-the-fly creation). */
  createValueFn: (val: string, done: (value: unknown, mode?: 'add' | 'add-unique' | 'toggle') => void) => void
  /** Requests the full list of options from the backend again. */
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
 * Composable for the remote population of a `q-select` from an
 * `IFieldDef` with `type: 'select'` and `url` set. Reactive: if the field's `url`, `type` or `options`
 * change the options are recomputed. Must be called in `setup()`.
 *
 * The fetch is single (`pageSize` 1000 by default, `field.pageSize` to change it): if the backend
 * declares more items than received, a warning is printed to the console in development.
 * On error it sets `error` and shows a translated Quasar notification (it/en).
 *
 * With `dependsOn`/`params` (and `valuesSource`) the options reload when the values they
 * depend on change; while a dependency is empty nothing is loaded and the options are empty.
 *
 * @param fieldSource - field definition (value, ref or getter)
 * @param valuesSource - current section values, for `dependsOn`/`params` (value, ref or getter)
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
  // "virtual" options created on the fly: they survive recomputations/reloads until the scope (url/params) changes
  let virtualOptions: unknown[] = []
  let scopeKey = ''
  const { t } = usePachiI18n(messages)
  // the app's $q resolved in setup (independent of the copy of quasar seen by the package)
  const $q = resolveQuasar()
  let requestId = 0

  function notifyError(): void {
    try {
      showNotify($q, {
        type: 'negative',
        message: t('pachiEditDialogFields.loadError', { label: field().label ?? field().field }),
      })
    } catch {
      // Notify plugin not installed: the `error` state remains
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
      // client resolved here (lazy): forms without remote selects do not require any HTTP client
      const http = getPachiFieldsHttp()
      const query = buildRemoteQuery(current, values())
      const parsed = parseRemoteResponse(await http.get<unknown>(current.url, query))
      if (id !== requestId) return
      if (
        import.meta.env?.DEV &&
        (parsed.total ?? 0) > parsed.items.length
      ) {
        console.warn(
          `[pachi-kit/fields] "${current.field}": received ${parsed.items.length} items out of ${parsed.total} (pageSize ${query.pageSize}): options truncated, use field.pageSize.`,
        )
      }
      allOptions.value = mergeVirtualOptions(parsed.items, virtualOptions, optionValue())
      options.value = allOptions.value
    } catch (err) {
      if (id !== requestId) return
      if (import.meta.env?.DEV) {
        console.error(`[pachi-kit/fields] "${current.field}": failed to load options`, err)
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
        // dependencies/params: serialized to reload only when the result really changes
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
      // DynamicField uses emitValue+mapOptions: the value passed to `done()` becomes
      // the model directly, without further mapping — here the id of the found option.
      done(getOptionValueOf(found), 'add-unique')
      return
    }
    // No existing option matches the typed text: the backend (e.g. an `int|str|RelatedRef` field) resolves the get-or-create by name from the raw
    // string value. A "virtual" option is still registered so it can be re-selected
    // without retyping it, with optionValue equal to the typed text.
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
