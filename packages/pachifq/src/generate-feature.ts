import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { suggestIcons } from './helper/mdi-icons.js'

export class GenerateFeatureError extends Error {}

export interface GenerateFeatureOptions {
  /** Directory <cwd>/src/features del progetto target. */
  featuresDir: string
  /** Nome feature in kebab-case, es. "invoices". */
  name: string
  title: string
  description: string
  /** Nome export da @quasar/extras/mdi-v7, es. "mdiFileDocumentOutline". */
  icon?: string
  /** Nomi reali degli export di `@quasar/extras/mdi-v7` per validare `icon` (se assente, solo controllo sintattico). */
  iconNames?: ReadonlySet<string> | null
  order?: number
  /**
   * Rotte figlie in kebab-case (es. ["billing", "reports"]). Se presenti, la
   * feature non genera una pagina indice unica ma diventa una sezione con
   * una card per figlio (dashboard), ognuno con una pagina vuota di default.
   */
  children?: string[]
}

export interface GeneratedFeatureResult {
  featureDir: string
  files: string[]
}

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** Nomi di feature riservati: rotte radice della shell (`/auth/login`, ...) che la feature oscurerebbe. */
export const RESERVED_FEATURE_NAMES: readonly string[] = ['auth', 'login']

/**
 * Chiavi i18n già usate a livello di namespace dalla feature generata: un figlio con la stessa chiave
 * (es. `title`) produrrebbe una chiave duplicata nei locali.
 */
export const RESERVED_LOCALE_KEYS: readonly string[] = [
  'title',
  'description',
  'loading',
  'errorTitle',
  'errorDescription',
  'retry',
  'emptyTitle',
  'emptyDescription',
  'placeholderTitle',
  'placeholderDescription',
]

/** Esporta identificatori mdi di `@quasar/extras/mdi-v7`: `mdi` + PascalCase/cifre. */
const ICON_RE = /^mdi[A-Z][A-Za-z0-9]*$/

function assertKebab(name: string, what: string): void {
  if (!KEBAB_CASE_RE.test(name)) {
    throw new GenerateFeatureError(`Nome ${what} non valido: "${name}". Usa kebab-case (es. "invoices", "time-tracking").`)
  }
}

/**
 * Valida il nome di una feature: kebab-case e non riservato.
 *
 * @param name - nome feature
 * @throws GenerateFeatureError se non valido
 */
export function validateFeatureName(name: string): void {
  assertKebab(name, 'feature')
  if (RESERVED_FEATURE_NAMES.includes(name)) {
    throw new GenerateFeatureError(`Nome feature riservato: "${name}" (rotta della shell). Scegline un altro.`)
  }
}

/**
 * Valida le rotte figlie: kebab-case, senza duplicati e senza collisioni con le chiavi i18n della feature.
 *
 * @param children - nomi dei figli
 * @throws GenerateFeatureError se non valide
 */
export function validateChildren(children: readonly string[]): void {
  const seen = new Set<string>()
  for (const child of children) {
    assertKebab(child, 'rotta figlia')
    if (seen.has(child)) throw new GenerateFeatureError(`Rotta figlia duplicata: "${child}".`)
    seen.add(child)
    const key = camelCase(child)
    if (RESERVED_LOCALE_KEYS.includes(key)) {
      throw new GenerateFeatureError(`Nome di rotta figlia non ammesso: "${child}" (la chiave i18n "${key}" è già usata dalla feature).`)
    }
  }
}

/**
 * Valida il titolo (non vuoto).
 *
 * @param title - titolo della feature
 * @throws GenerateFeatureError se vuoto
 */
export function validateTitle(title: string): void {
  if (!title.trim()) throw new GenerateFeatureError('Il titolo non può essere vuoto.')
}

/**
 * Valida il nome dell'icona: identificatore `mdi...` (viene scritto in un `import { ... }`) e,
 * se si conosce l'elenco reale, export esistente di `@quasar/extras/mdi-v7`.
 *
 * @param icon - nome export di `@quasar/extras/mdi-v7`
 * @param known - nomi reali degli export; se omesso o `null` la validazione è solo sintattica
 * @throws GenerateFeatureError se non valida (con suggerimenti simili quando disponibili)
 */
export function validateIcon(icon: string, known?: ReadonlySet<string> | null): void {
  if (!ICON_RE.test(icon)) {
    throw new GenerateFeatureError(`Icona non valida: "${icon}". Usa il nome di un export di @quasar/extras/mdi-v7 (es. "mdiFileDocumentOutline").`)
  }
  if (known && !known.has(icon)) {
    const similar = suggestIcons(icon, known)
    const hint = similar.length > 0 ? ` Forse intendevi: ${similar.join(', ')}.` : ''
    throw new GenerateFeatureError(`Icona inesistente in @quasar/extras/mdi-v7: "${icon}".${hint}`)
  }
}

function pascalCase(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/** "billing-info" -> "billingInfo" (namespace i18n della feature) */
function camelCase(name: string): string {
  const pascal = pascalCase(name)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/** Stringa TS tra apici singoli (escape di backslash, apici, newline e separatori di riga Unicode). */
export function tsString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `'${escaped}'`
}

/** Testo come messaggio vue-i18n: i caratteri speciali `{ } @ | $` diventano letterali. */
export function msg(value: string): string {
  return tsString(value.replace(/[{}@|$]/g, (ch) => `{'${ch}'}`))
}

/** "billing-info" -> "Billing Info" */
function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function generateFeature(options: GenerateFeatureOptions): Promise<GeneratedFeatureResult> {
  validateFeatureName(options.name)
  validateTitle(options.title)
  if (options.icon !== undefined) validateIcon(options.icon, options.iconNames)
  validateChildren(options.children ?? [])

  const { name, featuresDir } = options
  const featureDir = path.join(featuresDir, name)
  if (existsSync(featureDir)) {
    throw new GenerateFeatureError(
      `La cartella "${featureDir}" esiste già. Scegli un altro nome o rimuovi la feature esistente prima di rigenerarla.`,
    )
  }

  const Name = pascalCase(name)
  const order = options.order ?? 99
  const children = options.children ?? []
  const childMeta = children.map((childName) => ({ name: childName, Name: pascalCase(childName), title: humanize(childName) }))

  const ns = camelCase(name)
  const locales = localeSources({ ns, title: options.title, description: options.description, children: childMeta.map((c) => ({ key: camelCase(c.name), title: c.title })) })

  const files: Record<string, string> = {
    'locales/it.ts': locales.it,
    'locales/en.ts': locales.en,
    'routes.ts': routesTemplate({
      name,
      Name,
      ns,
      title: options.title,
      description: options.description,
      order,
      ...(options.icon !== undefined && { icon: options.icon }),
      children: childMeta,
    }),
    ...(childMeta.length === 0
      ? { [`pages/${Name}IndexPage.vue`]: pageSource({ name, Name, ns }) }
      : Object.fromEntries(childMeta.map((c) => [`pages/${c.Name}Page.vue`, blankPageSource({ ns, key: camelCase(c.name) })]))),
    [`stores/use-${name}-store.ts`]: storeSource({ name, Name }),
    [`services/${name}-api.ts`]: serviceSource({ name, Name }),
    [`types/${name}.d.ts`]: typesTemplate({ Name }),
    'components/.gitkeep': '',
  }

  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(featureDir, relPath)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content, 'utf-8')
  }

  return { featureDir, files: Object.keys(files).map((f) => path.join(featureDir, f)) }
}

// ---- Templates -----------------------------------------------------------

function routesTemplate({
  name,
  Name,
  ns,
  title,
  description,
  icon,
  order,
  children,
}: {
  name: string
  Name: string
  /** Namespace i18n della feature (nome in camelCase). */
  ns: string
  title: string
  description: string
  icon?: string
  order: number
  children: { name: string; Name: string; title: string }[]
}): string {
  const iconImport = icon ? `\nimport { ${icon} } from '@quasar/extras/mdi-v7'` : ''
  const iconLine = icon ? `\n      icon: ${icon},` : ''
  // `titleKey`/`descriptionKey` (i18n, reattivi al cambio lingua) hanno la precedenza; `title`/`description`
  // letterali restano come fallback (e li legge `pachifq list`).
  const keyLines = `\n      titleKey: '${ns}.title',${description ? `\n      descriptionKey: '${ns}.description',` : ''}`

  if (children.length === 0) {
    return `import type { RouteRecordRaw } from 'vue-router'${iconImport}

export default [
  {
    path: '/${name}',
    meta: {
      title: ${tsString(title)},${keyLines}
      description: ${tsString(description)},${iconLine}
      order: ${order},
      // permissions: ['${name}.view'],
      // requireStaff: true,
    },
    component: () => import('./pages/${Name}IndexPage.vue'),
  },
] as RouteRecordRaw[]
`
  }

  const childrenBlock = children
    .map(
      (c) => `      {
        path: '${c.name}',
        meta: {
          title: ${tsString(c.title)},
          titleKey: '${ns}.${camelCase(c.name)}.title',
          description: '',
          order: 99,
        },
        component: () => import('./pages/${c.Name}Page.vue'),
      },`,
    )
    .join('\n')

  return `import type { RouteRecordRaw } from 'vue-router'${iconImport}

export default [
  {
    path: '/${name}',
    meta: {
      title: ${tsString(title)},${keyLines}
      description: ${tsString(description)},${iconLine}
      order: ${order},
      // permissions: ['${name}.view'],
      // requireStaff: true,
    },
    // Nessun "component": la sezione mostra automaticamente una card per figlio (dashboard).
    children: [
${childrenBlock}
    ],
  },
] as RouteRecordRaw[]
`
}

function pageSource({ name, Name, ns }: { name: string; Name: string; ns: string }): string {
  return `<template>
  <div class="q-pa-md">
    <h1 class="text-h5 q-mb-md">{{ t('${ns}.title') }}</h1>

    <pachi-loading-state v-if="loading" :label="t('${ns}.loading')" />
    <pachi-error-state
      v-else-if="error"
      :title="t('${ns}.errorTitle')"
      :description="t('${ns}.errorDescription')"
      :primary-label="t('${ns}.retry')"
      @primary="reload"
    />
    <pachi-empty-state
      v-else-if="items.length === 0"
      :icon="mdiInbox"
      :title="t('${ns}.emptyTitle')"
      :description="t('${ns}.emptyDescription')"
    />
    <q-list v-else bordered separator>
      <q-item v-for="item in items" :key="item.id">
        <q-item-section>{{ item.id }}</q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiInbox } from '@quasar/extras/mdi-v7'
import { PachiEmptyState, PachiErrorState, PachiLoadingState } from '@ilpachi/pachifastquasar'
import { use${Name}Store } from '../stores/use-${name}-store'
import { list${Name} } from '../services/${name}-api'
import type { I${Name} } from '../types/${name}'

const { t } = useI18n()
const store = use${Name}Store()
const items = ref<I${Name}[]>([])
const loading = ref(true)
const error = ref(false)

async function reload() {
  loading.value = true
  error.value = false
  try {
    const response = await list${Name}()
    items.value = response.items
    store.setLastLoadedAt(Date.now())
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(reload)
</script>
`
}

/** Pagina di default per una rotta figlia: solo titolo + empty state, nessuna logica. */
function blankPageSource({ ns, key }: { ns: string; key: string }): string {
  return `<template>
  <div class="q-pa-md">
    <h1 class="text-h5 q-mb-md">{{ t('${ns}.${key}.title') }}</h1>

    <pachi-empty-state
      :icon="mdiHammerWrench"
      :title="t('${ns}.placeholderTitle')"
      :description="t('${ns}.placeholderDescription')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { mdiHammerWrench } from '@quasar/extras/mdi-v7'
import { PachiEmptyState } from '@ilpachi/pachifastquasar'

const { t } = useI18n()
</script>
`
}

/** Sorgenti `locales/it.ts` (riferimento) e `locales/en.ts` (tipizzato come it) della feature. */
function localeSources({
  ns,
  title,
  description,
  children,
}: {
  ns: string
  title: string
  description: string
  children: { key: string; title: string }[]
}): { it: string; en: string } {
  const lines = (entries: [string, string][], indent: string): string =>
    entries.map(([k, v]) => `${indent}${k}: ${v},`).join('\n')

  const build = (strings: Record<string, string>, enTodo: boolean): string => {
    const entries: [string, string][] = Object.entries(strings).map(([k, v]) => [k, msg(v)])
    const childBlocks = children.map((c) => `    ${c.key}: {\n      title: ${msg(c.title)},\n    },`)
    const todo = enTodo ? '    // TODO: traduci i valori (titoli inclusi)\n' : ''
    return `${todo}${lines(entries, '    ')}${childBlocks.length ? `\n${childBlocks.join('\n')}` : ''}`
  }

  const descriptionEntry: Record<string, string> = description ? { description } : {}
  const itStrings: Record<string, string> =
    children.length === 0
      ? {
          title,
          ...descriptionEntry,
          loading: `Caricamento ${title.toLowerCase()}...`,
          errorTitle: 'Errore caricamento',
          errorDescription: 'Non è stato possibile caricare i dati.',
          retry: 'Riprova',
          emptyTitle: 'Nessun elemento',
          emptyDescription: `Non ci sono ancora elementi in '${title}'.`,
        }
      : {
          title,
          ...descriptionEntry,
          placeholderTitle: 'Da implementare',
          placeholderDescription: 'Questa pagina è generata come segnaposto. Sostituisci questo contenuto con quello reale.',
        }
  const enStrings: Record<string, string> =
    children.length === 0
      ? {
          title,
          ...descriptionEntry,
          loading: `Loading ${title.toLowerCase()}...`,
          errorTitle: 'Loading error',
          errorDescription: 'The data could not be loaded.',
          retry: 'Retry',
          emptyTitle: 'No items',
          emptyDescription: `There are no items in '${title}' yet.`,
        }
      : {
          title,
          ...descriptionEntry,
          placeholderTitle: 'To be implemented',
          placeholderDescription: 'This page is a generated placeholder. Replace this content with the real one.',
        }

  return {
    it: `/** Messaggi italiani della feature (lingua di riferimento). */
export default {
  ${ns}: {
${build(itStrings, false)}
  },
}
`,
    en: `import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of the feature: same keys as \`it.ts\`. */
const en: PachiMessages<typeof it> = {
  ${ns}: {
${build(enStrings, true)}
  },
}

export default en
`,
  }
}

function storeSource({ name, Name }: { name: string; Name: string }): string {
  return `import { defineStore } from 'pinia'
import { ref } from 'vue'

// Se serve persistere lo stato lato client, aggiungi:
//   import 'pinia-plugin-persistedstate'
// e passa { persist: true } come terzo argomento di defineStore.
export const use${Name}Store = defineStore('${name}', () => {
  const lastLoadedAt = ref<number | null>(null)

  function setLastLoadedAt(value: number) {
    lastLoadedAt.value = value
  }

  return {
    lastLoadedAt,
    setLastLoadedAt,
  }
})
`
}

function serviceSource({ name, Name }: { name: string; Name: string }): string {
  return `import { getUseAlovaInstance } from '@ilpachi/use-alova'
import type { I${Name}, IPaginated${Name} } from '../types/${name}'

/**
 * Client HTTP dell'app (@ilpachi/use-alova, cablato da createPachiApp in src/boot/pachi.ts): Authorization, refresh del
 * token, spinner e messaggi di errore sono già gestiti. Risolto a ogni chiamata, così non dipende
 * dall'ordine di inizializzazione dei boot.
 */
function http() {
  return getUseAlovaInstance()({ url: '/api/${name}' }).alova
}

export async function list${Name}(params: { page?: number; pageSize?: number; search?: string } = {}): Promise<IPaginated${Name}> {
  return http().Get<IPaginated${Name}>('', { params, cacheFor: 0 })
}

export async function get${Name}(id: string | number): Promise<I${Name}> {
  return http().Get<I${Name}>(\`/\${id}\`, { cacheFor: 0 })
}

export async function create${Name}(payload: Partial<I${Name}>): Promise<I${Name}> {
  return http().Post<I${Name}>('/', payload, { cacheFor: 0 })
}

export async function update${Name}(id: string | number, payload: Partial<I${Name}>): Promise<I${Name}> {
  return http().Put<I${Name}>(\`/\${id}\`, payload, { cacheFor: 0 })
}

export async function remove${Name}(id: string | number): Promise<void> {
  await http().Delete(\`/\${id}\`, { cacheFor: 0 })
}
`
}

function typesTemplate({ Name }: { Name: string }): string {
  return `export interface I${Name} {
  id: string | number
  // TODO: definisci i campi reali del modello ${Name}
}

export interface IPaginated${Name} {
  items: I${Name}[]
  total: number
}
`
}
