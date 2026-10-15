<template>
  <div class="pachi-admin-history">
    <div v-if="loading && !items.length" class="pachi-admin-state">
      <q-spinner size="24px" color="primary" />
      <div>{{ t('pachiAdmin.history.loading') }}</div>
    </div>
    <div v-else-if="errorText" class="pachi-admin-banner pachi-admin-banner--error" role="alert">
      {{ errorText }}
      <q-btn flat dense no-caps type="button" :label="t('pachiAdmin.common.retry')" @click="load" />
    </div>
    <div v-else-if="!items.length" class="pachi-admin-state">{{ t('pachiAdmin.history.empty') }}</div>
    <ol v-else class="pachi-admin-history__list">
      <li v-for="entry in items" :key="String(entry.id)" class="pachi-admin-history__entry">
        <div class="pachi-admin-history__head">
          <q-badge :class="`pachi-admin-history__badge pachi-admin-history__badge--${entryKind(entry)}`" :label="entryLabel(entry)" />
          <span class="pachi-admin-history__who">
            {{ t('pachiAdmin.history.by', { user: entry.username || t('pachiAdmin.history.system') }) }}
          </span>
          <time class="pachi-admin-history__time" :datetime="entry.timestamp">{{ formatTime(entry.timestamp) }}</time>
        </div>
        <ul v-if="changesOf(entry).length" class="pachi-admin-history__changes">
          <li v-for="change in changesOf(entry)" :key="change.field">
            <span class="pachi-admin-history__field">{{ changeLabel(change.field) }}</span>
            <span class="pachi-admin-history__old">{{ formatHistoryValue(change.old) }}</span>
            <q-icon :name="mdiArrowRight" size="14px" />
            <span class="pachi-admin-history__new">{{ formatHistoryValue(change.new) }}</span>
          </li>
        </ul>
        <div v-else class="pachi-admin-history__empty">{{ t('pachiAdmin.history.noChanges') }}</div>
      </li>
    </ol>
    <div v-if="pages > 1" class="pachi-admin-history__pager">
      <q-pagination
        v-model="page"
        :max="pages"
        :max-pages="6"
        :disable="loading"
        direction-links
        dense
        flat
        @update:model-value="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiArrowRight } from '@quasar/extras/mdi-v7'
import { ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { AdminPk, IAdminHistoryEntry, IAdminSchema } from '../types/admin'
import { messages } from '../locales'
import { formatHistoryValue, historyChanges, parseHistoryAction } from '../helpers/history'
import { fieldKey } from '../helpers/model-key'
import { actionLabel, fieldLabel } from '../helpers/schema-text'
import { describeRequestError, useAdminApi } from '../helpers/use-admin'

/**
 * History of a row (`GET .../<pk>/history`): paginated list, newest first, with the `old → new` diff
 * of each modified field.
 */
const props = withDefaults(defineProps<{
  schema: IAdminSchema
  pk: AdminPk
  pageSize?: number
}>(), { pageSize: 10 })

const { t, locale } = usePachiI18n(messages)
const api = useAdminApi()

const items = ref<IAdminHistoryEntry[]>([])
const page = ref(1)
const pages = ref(1)
const loading = ref(false)
const errorText = ref('')

/** Loads the current page. */
async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await api.history(props.schema.app, props.schema.model, props.pk, page.value, props.pageSize)
    items.value = res.items
    pages.value = Math.max(1, res.pages)
  } catch (err) {
    errorText.value = (await describeRequestError(err, (k, p) => t(k, p ?? {}))).message
  } finally {
    loading.value = false
  }
}

/** Local date and time of an entry. */
function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat(String(locale.value), { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}

/** Kind of an entry (for the badge style). */
function entryKind(entry: IAdminHistoryEntry): string {
  return parseHistoryAction(entry.action).kind
}

/** Action label: add/change/delete translated, bulk action with its schema label. */
function entryLabel(entry: IAdminHistoryEntry): string {
  const parsed = parseHistoryAction(entry.action)
  if (parsed.kind === 'action') {
    const action = props.schema.actions.find((a) => a.name === parsed.name)
    return t('pachiAdmin.history.action', { name: action ? actionLabel(action) : (parsed.name ?? '') })
  }
  return t(`pachiAdmin.history.${parsed.kind}`)
}

/** Changes of an entry. */
const changesOf = historyChanges

/** Field label (from the schema, if the field still exists). */
function changeLabel(name: string): string {
  const field = props.schema.fields[name]
  return field ? fieldLabel(fieldKey(props.schema.app, props.schema.model, name), field) : name
}

watch(() => [props.schema.app, props.schema.model, props.pk], () => {
  page.value = 1
  void load()
}, { immediate: true })
</script>
