<template>
  <q-select
    :model-value="modelValue"
    :label="label"
    :options="options"
    :loading="loading"
    :disable="disable"
    :error="error"
    :error-message="errorMessage"
    :clearable="clearable && !disable"
    :hint="disable ? undefined : t('pachiAdmin.form.lookupHint')"
    class="pachi-admin-lookup"
    option-value="value"
    option-label="label"
    emit-value
    map-options
    use-input
    hide-selected
    fill-input
    input-debounce="300"
    outlined
    dense
    no-error-icon
    @filter="onFilter"
    @update:model-value="onUpdate"
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey">{{ t('pachiAdmin.form.lookupNoResult') }}</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { AdminPk, IAdminLookup, IAdminLookupOption } from '../types/admin'
import { messages } from '../locales'
import { useAdminApi } from '../helpers/use-admin'

/**
 * Selettore di una chiave esterna verso un modello registrato: le scelte arrivano da
 * `GET /admin/models/<app>/<model>/_options?search=` (ricerca asincrona con debounce) e il valore già salvato
 * si risolve in etichetta con `?ids=`.
 */
const props = withDefaults(defineProps<{
  modelValue?: AdminPk | null
  lookup: IAdminLookup
  label?: string | undefined
  disable?: boolean | undefined
  clearable?: boolean | undefined
  error?: boolean | undefined
  errorMessage?: string | undefined
}>(), { modelValue: null, label: '', disable: false, clearable: true, error: false, errorMessage: '' })

const emit = defineEmits<{
  (e: 'update:modelValue', value: AdminPk | null): void
}>()

const { t } = usePachiI18n(messages)
const api = useAdminApi()

const options = ref<IAdminLookupOption[]>([])
const loading = ref(false)
/** Etichette già note per valore (valore salvato e scelte passate). */
const known = new Map<string, IAdminLookupOption>()

/**
 * Ricorda le opzioni ricevute.
 *
 * @param items - opzioni del backend
 */
function remember(items: IAdminLookupOption[]): void {
  for (const item of items) known.set(String(item.value), item)
}

/** Opzioni da mostrare: i risultati più il valore salvato (così l'etichetta resta visibile). */
function withCurrent(items: IAdminLookupOption[]): IAdminLookupOption[] {
  const current = props.modelValue === null || props.modelValue === undefined ? null : known.get(String(props.modelValue))
  return current && !items.some((i) => String(i.value) === String(current.value)) ? [current, ...items] : items
}

/**
 * Risolve l'etichetta del valore salvato (`?ids=`).
 */
async function resolveCurrent(): Promise<void> {
  const value = props.modelValue
  if (value === null || value === undefined || value === '') return
  if (known.has(String(value))) {
    options.value = withCurrent(options.value)
    return
  }
  loading.value = true
  try {
    const page = await api.options(props.lookup.app, props.lookup.model, { ids: [value] })
    remember(page.items)
    options.value = withCurrent(options.value)
  } catch {
    // l'etichetta resta il valore: l'errore vero (403/404) emerge al salvataggio
    known.set(String(value), { value, label: String(value) })
    options.value = withCurrent(options.value)
  } finally {
    loading.value = false
  }
}

/**
 * Ricerca asincrona delle opzioni (chiamata da QSelect dopo il debounce).
 *
 * @param search - testo digitato
 * @param update - callback di QSelect per applicare le opzioni
 */
function onFilter(search: string, update: (fn: () => void) => void): void {
  loading.value = true
  api
    .options(props.lookup.app, props.lookup.model, { search, page: 1, pageSize: 20 })
    .then((page) => {
      remember(page.items)
      update(() => {
        options.value = withCurrent(page.items)
      })
    })
    .catch(() => update(() => { options.value = withCurrent([]) }))
    .finally(() => {
      loading.value = false
    })
}

/**
 * Propaga la scelta.
 *
 * @param value - valore scelto o `null`
 */
function onUpdate(value: AdminPk | null): void {
  emit('update:modelValue', value ?? null)
}

watch(() => props.modelValue, () => void resolveCurrent(), { immediate: true })
</script>
