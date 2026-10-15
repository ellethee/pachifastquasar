<template>
  <div class="pachi-st-layout">
    <!-- Sidebar -->
    <aside class="pachi-st-sidebar">
      <button
        v-for="s in sections"
        :key="s.key"
        type="button"
        class="pachi-st-sidebar__item"
        :class="{ 'pachi-st-sidebar__item--active': activeSection === s.key }"
        :aria-current="activeSection === s.key ? 'page' : undefined"
        @click="activeSection = s.key"
      >
        <div
          v-if="activeSection === s.key"
          class="pachi-st-sidebar__bar"
        ></div>
        <div
          class="pachi-st-sidebar__icon-box"
          :class="{ 'pachi-st-sidebar__icon-box--active': activeSection === s.key }"
        >
          <q-icon :name="s.icon" size="18px" />
        </div>
        <div class="pachi-st-sidebar__text">
          <div
            class="pachi-st-sidebar__label"
            :class="{ 'pachi-st-sidebar__label--active': activeSection === s.key }"
          >
            {{ s.label }}
          </div>
          <div v-if="s.desc" class="pachi-st-sidebar__desc">{{ s.desc }}</div>
        </div>
      </button>
    </aside>

    <!-- Form pane -->
    <div class="pachi-st-pane">
      <div v-if="loading" class="pachi-st-state">
        <q-spinner size="32px" color="primary" />
        <div class="pachi-st-state__title">{{ t('pachiSettings.loading') }}</div>
      </div>
      <div v-else-if="schemaError" class="pachi-st-state">
        <q-icon :name="mdiAlertCircleOutline" size="40px" color="negative" />
        <div class="pachi-st-state__title">{{ t('pachiSettings.errorTitle') }}</div>
        <div class="pachi-st-state__desc">{{ t('pachiSettings.errorDesc') }}</div>
        <q-btn flat no-caps type="button" color="primary" :label="t('pachiSettings.retry')" @click="reload" />
      </div>
      <template v-else>
      <!-- Local "Appearance" section (only if the backend has no `appearance` section) -->
      <template v-if="activeSection === 'appearance' && !settingsSchema['appearance']">
        <div class="pachi-st-card">
          <div class="pachi-st-section-head">
            <span>{{ t('pachiSettings.appearance') }}</span>
            <span class="pachi-st-section-head__note">{{ t('pachiSettings.appearanceNote') }}</span>
          </div>
          <div class="pachi-st-card__body">
            <pachi-option-picker
              v-model="activeTheme"
              variant="theme"
              :label="t('pachiSettings.theme')"
              :options="themeOptions"
              @update:model-value="setTheme"
            />
            <pachi-option-picker
              v-model="activeAccent"
              variant="accent"
              :label="t('pachiSettings.accent')"
              :options="accentOptions"
              @update:model-value="setAccent"
            />
            <pachi-option-picker
              v-model="activeDensity"
              variant="segmented"
              :label="t('pachiSettings.density')"
              :options="densityOptions"
              @update:model-value="setDensity"
            />
          </div>
        </div>

        <!-- Danger zone -->
        <div class="pachi-st-danger-zone">
          <div class="pachi-st-danger-zone__icon"><q-icon :name="mdiAlert" /></div>
          <div class="pachi-st-danger-zone__text">
            <div class="pachi-st-danger-zone__title">{{ t('pachiSettings.resetTitle') }}</div>
            <div class="pachi-st-danger-zone__desc">{{ t('pachiSettings.resetDesc') }}</div>
          </div>
          <q-btn
            flat
            no-caps
            dense
            size="13px"
            :label="t('pachiSettings.reset')"
            type="button"
            class="pachi-st-danger-zone__btn"
            @click="resetPrefs"
          />
        </div>
      </template>

      <!-- Sections generated from the schema (also next to the local one if the key matches) -->
        <template v-if="currentSectionSchema">
          <div class="pachi-st-card">
            <div class="pachi-st-section-head">
              <span class="row items-center no-wrap">
                <q-icon
                  v-if="resolveSettingsIcon(currentSectionSchema.icon)"
                  :name="resolveSettingsIcon(currentSectionSchema.icon)"
                  size="18px"
                  class="q-mr-sm"
                />
                {{ sectionTitleText(currentSectionSchema) }}
              </span>
            </div>
            <div class="pachi-st-card__body">
              <div
                v-for="(prop, propKey) in currentSectionSchema.fields"
                :key="propKey"
              >
                <component
                  :is="prop.component"
                  v-model="prop.vModel"
                  v-bind="fieldProps(prop)"
                  dense
                  outlined
                  class="full-width q-mb-md"
                  v-on="resolveEvents(prop.events)"
                />
              </div>
            </div>
          </div>
        <div v-if="activeSection === 'appearance'" class="pachi-st-danger-zone">
          <div class="pachi-st-danger-zone__icon"><q-icon :name="mdiAlert" /></div>
          <div class="pachi-st-danger-zone__text">
            <div class="pachi-st-danger-zone__title">{{ t('pachiSettings.resetAppearanceTitle') }}</div>
            <div class="pachi-st-danger-zone__desc">{{ t('pachiSettings.resetAppearanceDesc') }}</div>
          </div>
          <q-btn
            flat
            no-caps
            dense
            size="13px"
            :label="t('pachiSettings.reset')"
            type="button"
            class="pachi-st-danger-zone__btn"
            @click="resetSchemaAppearance"
          />
        </div>
        </template>
        <template v-else-if="schemaLoaded && activeSection !== 'appearance'">
          <div class="pachi-st-state">
            <q-icon :name="mdiCog" size="40px" color="grey" />
            <div class="pachi-st-state__title">{{ t('pachiSettings.emptyTitle') }}</div>
            <div class="pachi-st-state__desc">{{ t('pachiSettings.emptyDesc') }}</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  mdiAccountCircleOutline,
  mdiAlert,
  mdiCheck,
  mdiAlertCircleOutline,
  mdiBellOutline,
  mdiCog,
  mdiDatabaseOutline,
  mdiKeyVariant,
  mdiPencil,
  mdiWeatherNight,
} from '@quasar/extras/mdi-v7'
import { resolveSettingsIcon } from '../helpers/icons'
import { ref, computed, onMounted } from 'vue'
import { useQuasar, format } from 'quasar'
import { quasarDeps, resolveQuasar } from '../helpers/quasar-instance'
import { QToggle, QInput, QSelect, QCheckbox } from 'quasar'
import type { Component } from 'vue'
import type { ISettingsCategory, ISettingsSchema, ISettingsSchemaResponse, ComponentType, SettingValue } from '../types/settings-manager'
import { fieldProperties, sectionTitle } from '../helpers/schema-text'
import { SettingsManager } from '../services/settings-manager'
import { getPachiSettingsOptions } from '../helpers/http'
import { resolveSettingsActions } from '../helpers/actions'
import type { SettingsActionSpec, SettingsResolvedHandler } from '../helpers/actions'
import { normalizeDensity, type SettingsDensity } from '../helpers/density'
import { collectApplyMap, type SettingsApplyMap } from '../helpers/apply'
import { readStorage, writeStorage } from '../helpers/storage'
import {
  ACCENT_PRESETS,
  ACCENT_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  clearLegacyLocalPrefs,
  runSettingsApplier,
} from '../services/appliers'
import PachiOptionPicker from './PachiOptionPicker.vue'
import { getPachiI18n, usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

/**
 * User settings page: local "Appearance" section (theme, accent, density in localStorage)
 * plus sections generated from the backend schema (see `SettingsManager`).
 */
const props = defineProps<{
  /**
   * Custom components resolvable from the schema `component` field
   * (e.g. `{ 'theme-toggle': ToggleThemeButton }`). If the name is not present
   * it falls back to QInput/QToggle.
   */
  components?: Record<string, Component>
}>()

// the app's $q (independent of the quasar copy seen by the package); useQuasar() only as a fallback
const $q = resolveQuasar() ?? useQuasar()
const { t, locale } = usePachiI18n(messages)
const { capitalize } = format
const settingsManager = SettingsManager.getInstance()

/** Icons and i18n keys of known sections (schema keys or the local `appearance` section). */
const KNOWN_SECTION_ICONS: Record<string, string> = {
  profile: mdiAccountCircleOutline,
  notifications: mdiBellOutline,
  editor: mdiPencil,
  database: mdiDatabaseOutline,
  appearance: mdiWeatherNight,
  api: mdiKeyVariant,
}

/** Sections shown until the schema has arrived (or if loading fails). */
const FALLBACK_SECTIONS = ['profile', 'notifications', 'editor', 'database', 'appearance', 'api']

/** Sidebar entry. */
interface ISidebarSection {
  key: string
  label: string
  desc: string
  icon: string
}

/** Entry of a known section with the package texts. */
function knownSection(key: string): ISidebarSection {
  return {
    key,
    icon: KNOWN_SECTION_ICONS[key] ?? mdiCog,
    label: t(`pachiSettings.sections.${key}.label`),
    desc: t(`pachiSettings.sections.${key}.desc`),
  }
}

/**
 * Sidebar sections: the schema categories (title from `titleKey`/`title`, icon from `icon`)
 * plus the local `appearance` section. If the schema already has an `appearance` category, the entry is single
 * and shows both. Before the schema arrives the six fixed sections are used.
 */
const sections = computed<ISidebarSection[]>(() => {
  void locale.value
  if (!schemaLoaded.value) return FALLBACK_SECTIONS.map(knownSection)
  const list = Object.entries(settingsSchema.value).map(([key, category]): ISidebarSection => {
    const known = Object.hasOwn(KNOWN_SECTION_ICONS, key)
    return {
      key,
      icon: resolveSettingsIcon(category.icon) ?? KNOWN_SECTION_ICONS[key] ?? mdiCog,
      label: category.titleKey || !known ? sectionTitleText(category) : t(`pachiSettings.sections.${key}.label`),
      desc: known ? t(`pachiSettings.sections.${key}.desc`) : '',
    }
  })
  if (!settingsSchema.value['appearance']) list.push(knownSection('appearance'))
  return list
})

/** Options of the local section choices (package texts). */
const themeOptions = computed(() => ['dark', 'light', 'auto'].map((value) => ({ value, label: t(`pachiSettings.themes.${value}`) })))
const accentOptions = computed(() =>
  Object.keys(ACCENT_PRESETS).map((value) => ({ value, label: t(`pachiSettings.accents.${value}`) }))
)

const DENSITY_KEYS: SettingsDensity[] = ['comf', 'compact']
/** i18n key of each density label (unchanged from previous versions). */
const DENSITY_LABEL_KEYS: Record<SettingsDensity, string> = { comf: 'comf', compact: 'comp' }

const densityOptions = computed(() => DENSITY_KEYS.map((key) => ({ value: key, label: t(`pachiSettings.densities.${DENSITY_LABEL_KEYS[key]}`) })))

const activeSection = ref('appearance')
const activeTheme   = ref(readStorage(THEME_STORAGE_KEY) ?? 'dark')
const activeDensity = ref<SettingsDensity>(normalizeDensity(readStorage(DENSITY_STORAGE_KEY)))
const activeAccent  = ref(readStorage(ACCENT_STORAGE_KEY) ?? 'teal')

const settingsSchema = ref<ISettingsSchemaResponse>({})
const schemaLoaded = ref(false)
/** Fields with an applier (`category.field` -> name), from the schema. */
const applyMap = ref<SettingsApplyMap>({})
const loading = ref(true)
const schemaError = ref(false)

const currentSectionSchema = computed(() => settingsSchema.value[activeSection.value] ?? null)

/** Runs the applier and remembers the local choice (fallback without a backend `appearance` section). */
function setLocalPref(name: string, storageKey: string, value: string): void {
  writeStorage(storageKey, value)
  runSettingsApplier(name, value, { source: 'set' })
}

function setTheme(key: string) {
  activeTheme.value = key
  runSettingsApplier('theme', key, { source: 'set' })
}

function setAccent(key: string) {
  activeAccent.value = key
  setLocalPref('accent', ACCENT_STORAGE_KEY, key)
}

function setDensity(key: string) {
  const density = normalizeDensity(key)
  activeDensity.value = density
  setLocalPref('density', DENSITY_STORAGE_KEY, density)
}

function resetPrefs() {
  clearLegacyLocalPrefs()
  setTheme('dark')
  setAccent('teal')
  setDensity('comf')
}

/** Applier of a schema field (`apply` or defaults of the standard fields). */
function applyNameOf(category: string, key: string): string | undefined {
  return applyMap.value[`${category}.${key}`]
}

/** Look of the dedicated picker for the `theme`, `accent`, `density` appliers (otherwise the schema component). */
const PICKER_VARIANTS: Record<string, 'theme' | 'accent' | 'segmented'> = {
  theme: 'theme',
  accent: 'accent',
  density: 'segmented',
}

/**
 * Look of a field's dedicated picker: `theme`/`accent` component or `select` with a
 * `theme`/`accent`/`density` applier; `undefined` if the field uses the schema component.
 */
function pickerVariantOf(field: ISettingsSchema, applyName?: string): 'theme' | 'accent' | 'segmented' | undefined {
  if (field.component === 'theme' || field.component === 'accent') return PICKER_VARIANTS[field.component]
  if (field.component !== 'select' && field.component !== 'QSelect') return undefined
  return applyName ? PICKER_VARIANTS[applyName] : undefined
}

function getComponentFromProperty(property: ISettingsSchema, settingValue: unknown, applyName?: string): ComponentType {
  const custom = props.components?.[property.component]
  if (custom) return custom
  if (pickerVariantOf(property, applyName) && Array.isArray(property.properties?.options)) return PachiOptionPicker
  switch (property.component) {
    case 'string': case 'text': case 'number': case 'input': case 'QInput': return QInput
    case 'QToggle': case 'toggle': return QToggle
    case 'QCheckbox': case 'checkbox': return QCheckbox
    case 'select': case 'QSelect': return QSelect
    default: {
      return typeof settingValue === 'boolean' ? QToggle : QInput
    }
  }
}

/** Cache of handlers already resolved per `events` object (avoids recreating them on every render). */
const eventsCache = new WeakMap<object, Record<string, SettingsResolvedHandler>>()

/**
 * Resolves the schema `events` into handlers through named actions (see `registerSettingsActions`);
 * script strings are run only with `setPachiSettingsOptions({ allowScriptStrings: true })`.
 */
function resolveEvents(events?: Record<string, SettingsActionSpec>): Record<string, SettingsResolvedHandler> {
  if (!events) return {}
  let handlers = eventsCache.get(events)
  if (!handlers) {
    handlers = resolveSettingsActions(events, {
      deps: quasarDeps($q),
      allowScriptStrings: getPachiSettingsOptions().allowScriptStrings,
    })
    eventsCache.set(events, handlers)
  }
  return handlers
}

/** Section title translated from the schema key (reactive to language changes). */
function sectionTitleText(category: ISettingsCategory): string {
  void locale.value
  return sectionTitle(category)
}

/** Field properties with texts translated from the schema keys (reactive to language changes). */
function fieldProps(field: ISettingsSchema & { pickerVariant?: string }): Record<string, unknown> {
  void locale.value
  const properties = fieldProperties(field)
  if (field.pickerVariant) {
    return { options: properties.options, label: properties.label, variant: field.pickerVariant }
  }
  return properties
}

function reload() { window.location.reload() }

/** Model of a numeric field: QInput emits strings, the backend wants a number (empty = `null`). */
function numberModel(category: string, key: string) {
  return computed<number | null | undefined>({
    get: () => settingsManager.get(category, key) as number | null | undefined,
    set: (value) => {
      const raw = value as unknown
      const next = raw === '' || raw === null || raw === undefined ? null : Number(raw)
      settingsManager.set(category, key, next !== null && Number.isNaN(next) ? null : next)
    },
  })
}

/** Language field options: "automatic" (`null`) plus the languages offered by the app (native name). */
function buildLocaleOptions(): { label: string; value: string | null }[] {
  const available = (getPachiI18n()?.global.availableLocales ?? []) as string[]
  const options = available.map((code) => {
    let label = code
    try {
      const name = new Intl.DisplayNames([code], { type: 'language' }).of(code)
      if (name) label = name.charAt(0).toLocaleUpperCase(code) + name.slice(1)
    } catch {
      // unrecognised code: show the code itself
    }
    return { label, value: code as string | null }
  })
  return [{ label: t('pachiSettings.localeAuto'), value: null }, ...options]
}

/**
 * Resets to their default values the `appearance` fields present in the schema (saved on the backend).
 * The default is the schema one (`default`, also `null`); defaults written in the frontend apply only to
 * backends without a `default` in the schema.
 */
function resetSchemaAppearance() {
  const fields = settingsSchema.value['appearance']?.fields ?? {}
  for (const key of Object.keys(fields)) {
    const d = settingsManager.getDefault('appearance', key)
    if (d.found) settingsManager.set('appearance', key, d.value as SettingValue)
  }
}

/** Schema components the app does not render in the page (compat: the theme is now the `appearance.theme` field). */
const HIDDEN_COMPONENTS = new Set(['theme-toggle'])

onMounted(async () => {
  try {
    // settings already start loading at login (`installPachiSettings`): here the load in progress or completed is reused
    await settingsManager.ensureLoaded()
    const schema = settingsManager.schema
    applyMap.value = collectApplyMap(schema)
    Object.entries(schema).forEach(([appKey, category]) => {
      settingsSchema.value[appKey] = {
        ...category,
        title: category.title || capitalize(appKey),
        fields: Object.fromEntries(
          Object.entries(category.fields)
            .filter(([, field]) => !HIDDEN_COMPONENTS.has(field.component))
            .map(([key, field]) => {
              const applyName = applyNameOf(appKey, key)
              const isNumber = field.component === 'number'
              const isLocale = applyName === 'locale' && !Array.isArray(field.properties?.options)
              const localeOptions = isLocale ? buildLocaleOptions() : null
              return [
                key,
                {
                  ...field,
                  pickerVariant: pickerVariantOf(field, applyName),
                  component: localeOptions ? QSelect : getComponentFromProperty(field, settingsManager.get(appKey, key), applyName),
                  properties: {
                    ...field.properties,
                    ...(isNumber ? { type: 'number' } : {}),
                    ...(localeOptions ? { options: localeOptions, emitValue: true, mapOptions: true } : {}),
                    label: field.properties?.label ?? field.label ?? capitalize(key),
                  },
                  vModel: isNumber ? numberModel(appKey, key) : settingsManager.getReactiveForKey(appKey, key),
                },
              ]
            })
        ) as unknown as Record<string, ISettingsSchema & { component: ComponentType }>,
      }
    })
    schemaLoaded.value = true
  } catch {
    schemaError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss">
.pachi-st-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 16px;
  text-align: center;

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--pachi-ink);
  }

  &__desc {
    font-size: 12px;
    color: var(--pachi-muted);
  }
}

.pachi-st-layout {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  padding: 16px;
  flex: 1;
  min-height: 0;
  align-items: start;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
.pachi-st-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    position: relative;
    transition: background 0.15s;
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
    background: transparent;

    &:hover:not(&--active) {
      background: var(--pachi-surface);
    }

    &--active {
      background: var(--pachi-surface);
      border-color: var(--pachi-border-hi);
    }
  }

  &__bar {
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--pachi-accent);
    border-radius: 1px;
  }

  &__icon-box {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    background: var(--pachi-surface-2);
    border: 1px solid var(--pachi-border);
    color: var(--pachi-muted);
    display: grid;
    place-items: center;
    font-size: 13px;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &--active {
      background: var(--pachi-accent-soft);
      border-color: color-mix(in srgb, var(--pachi-accent) 33%, transparent);
      color: var(--pachi-accent-ink);
    }
  }

  &__text {
    min-width: 0;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: var(--pachi-ink-2);

    &--active {
      color: var(--pachi-ink);
    }
  }

  &__desc {
    font-size: 11px;
    color: var(--pachi-muted);
    margin-top: 1px;
  }
}

// ── Form pane ─────────────────────────────────────────────────────────────────
.pachi-st-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.pachi-st-card {
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: 12px;
  overflow: hidden;

  &__body {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
}

.pachi-st-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--pachi-border);
  background: var(--pachi-surface-2);
  font-family: var(--pachi-font);
  font-size: 13px;
  font-weight: 600;
  color: var(--pachi-ink);

  &__note {
    font-family: var(--pachi-mono);
    font-size: 10px;
    color: var(--pachi-muted);
    font-weight: 400;
  }
}

.pachi-st-setting-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--pachi-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

// Theme swatches
.pachi-st-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.pachi-st-theme-swatch {
  padding: 0;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1.5px solid var(--pachi-border);
  overflow: hidden;
  text-align: left;
  transition: border-color 0.15s;

  &--active {
    border-color: var(--pachi-accent);
  }

  &__preview {
    height: 64px;
    padding: 8px;
    position: relative;
  }

  &__card {
    width: 60px;
    height: 40px;
    border-radius: 5px;
    border: 1px solid rgba(0, 0, 0, 0.12);
  }

  &__footer {
    padding: 7px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--pachi-surface-2);
    border-top: 1px solid var(--pachi-border);
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--pachi-ink-2);

    &--active {
      color: var(--pachi-accent-ink);
    }
  }

  &__check {
    color: var(--pachi-accent);
    font-size: 13px;
  }
}

// Accent pills
.pachi-st-accent-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.pachi-st-accent-pill {
  padding: 8px 12px 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: var(--pachi-surface-2);
  border: 1.5px solid var(--pachi-border);
  font: inherit;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s, background 0.15s;

  &--active {
    background: var(--pachi-accent-soft);
  }
}

.pachi-st-accent-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.pachi-st-accent-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--pachi-ink-2);

  &--active {
    font-weight: 600;
    color: var(--pachi-ink);
  }
}

// Density toggle
.pachi-st-density-toggle {
  display: flex;
  padding: 3px;
  gap: 3px;
  background: var(--pachi-bg);
  border: 1px solid var(--pachi-border);
  border-radius: 8px;
  margin-top: 10px;
  width: fit-content;
}

.pachi-st-density-option {
  padding: 7px 14px;
  border-radius: 5px;
  cursor: pointer;
  background: transparent;
  border: 0;
  font-family: inherit;
  color: var(--pachi-muted);
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;

  &--active {
    background: var(--pachi-surface-3);
    color: var(--pachi-ink);
  }
}

// Danger zone
.pachi-st-danger-zone {
  background: var(--pachi-surface);
  border: 1px solid color-mix(in srgb, var(--pachi-red) 33%, transparent);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;

  &__icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--pachi-red-soft);
    color: var(--pachi-red);
    display: grid;
    place-items: center;
    font-size: 16px;
    border: 1px solid color-mix(in srgb, var(--pachi-red) 33%, transparent);
    flex-shrink: 0;
  }

  &__text {
    flex: 1;
  }

  &__btn {
    height: 32px !important;
    padding: 0 14px !important;
    color: var(--pachi-red) !important;
    border: 1px solid color-mix(in srgb, var(--pachi-red) 33%, transparent);
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--pachi-ink);
  }

  &__desc {
    font-size: 11.5px;
    color: var(--pachi-muted);
    margin-top: 2px;
  }
}
</style>
