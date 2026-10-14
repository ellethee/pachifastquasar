import { getPachiI18n, matchLocale } from '@ilpachi/pachi-i18n'
import { DENSITY_ATTRIBUTE, normalizeDensity } from '../helpers/density'
import { quasarDeps } from '../helpers/quasar-instance'
import { readStorage, removeStorage, writeStorage } from '../helpers/storage'

/** Da dove arriva il valore applicato. */
export type SettingsApplySource = 'cache' | 'load' | 'set' | 'reset'

/** Contesto passato a un applier. */
export interface ISettingsApplierContext {
  /** Nome con cui l'applier è registrato. */
  name: string
  /** Categoria dell'impostazione (assente per `reset`). */
  category?: string
  /** Chiave dell'impostazione (assente per `reset`). */
  key?: string
  /**
   * Origine: `cache` (boot, dalla cache dell'utente), `load` (caricamento dal backend), `set` (modifica
   * dell'utente), `reset` (logout o cambio utente: il valore è il `default` dello schema, anche `null`, oppure
   * `undefined` se lo schema non ne ha uno; tornare al default).
   */
  source: SettingsApplySource
}

/**
 * Funzione che rende effettivo un valore (tema, lingua, densità, ...). Deve essere idempotente: viene richiamata
 * con lo stesso valore al boot, al caricamento e a ogni modifica.
 */
export type SettingsApplier = (value: unknown, ctx: ISettingsApplierContext) => void

/** Chiave localStorage che conserva il tema (condivisa con `ToggleThemeButton` della shell). */
export const THEME_STORAGE_KEY = 'pachi-prefs-theme'
/** Chiave localStorage della densità (compatibilità con la sezione locale "Aspetto"). */
export const DENSITY_STORAGE_KEY = 'pachi-prefs-density'
/** Chiave localStorage dell'accent (compatibilità con la sezione locale "Aspetto"). */
export const ACCENT_STORAGE_KEY = 'pachi-prefs-accent'
/** Chiave localStorage della lingua (`@ilpachi/pachi-i18n`). */
export const LOCALE_STORAGE_KEY = 'pachi-prefs-locale'

/** Attributo di `<html>` per la scala del testo (`sm` | `md` | `lg`). */
export const FONT_SCALE_ATTRIBUTE = 'data-font-scale'
/** Attributo di `<html>` per ridurre le animazioni (`true`). */
export const REDUCE_MOTION_ATTRIBUTE = 'data-reduce-motion'

/** Colori dell'accent: `accent` e `ink` (testo/icone su sfondo neutro). */
export interface IAccentPreset {
  accent: string
  ink: string
}

/** Accent predefiniti. `teal` coincide col default di `theme-defaults.scss` (nessuna variabile inline). */
export const ACCENT_PRESETS: Readonly<Record<string, IAccentPreset>> = {
  teal: { accent: '#2DD4BF', ink: '#2DD4BF' },
  indigo: { accent: '#818CF8', ink: '#818CF8' },
  amber: { accent: '#FBBF24', ink: '#FBBF24' },
  violet: { accent: '#A78BFA', ink: '#A78BFA' },
  coral: { accent: '#F87171', ink: '#F87171' },
}

/** Variabili CSS scritte sull'elemento radice dall'applier `accent`. */
const ACCENT_VARIABLES = [
  '--pachi-accent',
  '--pachi-accent-soft',
  '--pachi-accent-mid',
  '--pachi-accent-ink',
  '--pachi-accent-deep',
] as const

/** Parte di `HTMLElement` usata dagli applier (permette di testarli senza DOM). */
export interface ISettingsRoot {
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): unknown }
}

/** Elemento radice (`<html>`), o `undefined` fuori dal browser. */
function getRoot(): ISettingsRoot | undefined {
  return (globalThis as { document?: { documentElement?: ISettingsRoot } }).document?.documentElement
}

/** Valore come stringa, o `undefined` se non è una stringa non vuota. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

/**
 * Applier `theme`: `dark` | `light` | `auto` su `$q.dark`; copia il valore in `pachi-prefs-theme`
 * (cache letta da `ToggleThemeButton` della shell). Su `reset` non fa nulla (il tema è una scelta del dispositivo).
 */
export const applyTheme: SettingsApplier = (value, ctx) => {
  if (ctx.source === 'reset') return
  const theme = value === 'light' || value === 'auto' ? value : 'dark'
  const dark = quasarDeps().Dark
  dark?.set(theme === 'auto' ? 'auto' : theme === 'dark')
  writeStorage(THEME_STORAGE_KEY, theme)
}

/**
 * Applier `accent`: imposta le variabili `--pachi-accent*` sull'elemento radice. Un accent sconosciuto, `teal`
 * o `reset` rimuovono le variabili (valgono i default del tema).
 */
export const applyAccent: SettingsApplier = (value) => {
  const root = getRoot()
  if (!root) return
  const key = asString(value)
  const preset = key && key !== 'teal' ? ACCENT_PRESETS[key] : undefined
  if (!preset) {
    for (const name of ACCENT_VARIABLES) root.style.removeProperty(name)
    return
  }
  root.style.setProperty('--pachi-accent', preset.accent)
  root.style.setProperty('--pachi-accent-soft', `color-mix(in srgb, ${preset.accent} 10%, transparent)`)
  root.style.setProperty('--pachi-accent-mid', `color-mix(in srgb, ${preset.accent} 20%, transparent)`)
  root.style.setProperty('--pachi-accent-ink', preset.ink)
  root.style.setProperty('--pachi-accent-deep', `color-mix(in srgb, ${preset.accent} 60%, black)`)
}

/** Applier `density`: attributo `data-density` (`comf` | `compact`). */
export const applyDensity: SettingsApplier = (value) => {
  getRoot()?.setAttribute(DENSITY_ATTRIBUTE, normalizeDensity(asString(value)))
}

/** Applier `fontScale`: attributo `data-font-scale` (`sm` | `lg`; `md`, valori ignoti e `reset` lo rimuovono). */
export const applyFontScale: SettingsApplier = (value) => {
  const root = getRoot()
  if (!root) return
  if (value === 'sm' || value === 'lg') root.setAttribute(FONT_SCALE_ATTRIBUTE, value)
  else root.removeAttribute(FONT_SCALE_ATTRIBUTE)
}

/** Applier `reduceMotion`: attributo `data-reduce-motion="true"` (rimosso se `false`/`reset`). */
export const applyReduceMotion: SettingsApplier = (value) => {
  const root = getRoot()
  if (!root) return
  if (value === true) root.setAttribute(REDUCE_MOTION_ATTRIBUTE, 'true')
  else root.removeAttribute(REDUCE_MOTION_ATTRIBUTE)
}

/** Ultima lingua impostata dall'applier (serve a non riscrivere sul backend ciò che arriva dal backend). */
let lastAppliedLocale: string | undefined

/** Lingua impostata per ultima da {@link applyLocale} (per distinguere le scelte dell'utente dal selettore). */
export function getLastAppliedLocale(): string | undefined {
  return lastAppliedLocale
}

/**
 * Applier `locale`: cambia la lingua di `@ilpachi/pachi-i18n` (codice, anche regionale: `it-IT` -> `it`).
 * `null`/vuoto = automatica (da `navigator.languages`). Su `reset` non fa nulla; senza i18n o con lingua fissa
 * (una sola lingua disponibile) non ha effetto.
 */
export const applyLocale: SettingsApplier = (value, ctx) => {
  if (ctx.source === 'reset') return
  const i18n = getPachiI18n()
  if (!i18n) return
  const available = [...i18n.global.availableLocales] as string[]
  let target: string | undefined
  const requested = asString(value)
  if (requested) target = matchLocale(requested, available)
  else {
    const languages = globalThis.navigator?.languages ?? []
    for (const language of languages) {
      target = matchLocale(language, available)
      if (target) break
    }
  }
  if (!target) return
  lastAppliedLocale = target
  if (i18n.global.locale.value !== target) i18n.global.locale.value = target
}

/** Registro degli applier (nome -> funzione). */
const registry = new Map<string, SettingsApplier>()

/** Registra gli applier standard (richiamata all'avvio e nei test). */
function registerBuiltins(): void {
  registry.set('theme', applyTheme)
  registry.set('accent', applyAccent)
  registry.set('density', applyDensity)
  registry.set('fontScale', applyFontScale)
  registry.set('reduceMotion', applyReduceMotion)
  registry.set('locale', applyLocale)
}
registerBuiltins()

/**
 * Registra (o sostituisce) un applier con nome: i campi dello schema con `apply: "<nome>"` lo eseguiranno.
 * Un applier registrato con il nome di uno standard lo sostituisce.
 *
 * @param name - nome usato in `apply`
 * @param applier - funzione `(value, ctx) => void`
 * @returns funzione che annulla la registrazione (ripristina l'eventuale applier standard)
 */
export function registerSettingsApplier(name: string, applier: SettingsApplier): () => void {
  const previous = registry.get(name)
  registry.set(name, applier)
  return () => {
    if (registry.get(name) !== applier) return
    if (previous) registry.set(name, previous)
    else registry.delete(name)
  }
}

/** Nomi degli applier registrati. */
export function listSettingsAppliers(): string[] {
  return [...registry.keys()]
}

/**
 * Esegue l'applier `name` (se esiste). Un errore dell'applier è registrato in console e non interrompe gli altri.
 *
 * @param name - nome dell'applier
 * @param value - valore da applicare
 * @param ctx - contesto (senza `name`)
 * @returns `true` se l'applier esiste
 */
export function runSettingsApplier(
  name: string,
  value: unknown,
  ctx: Omit<ISettingsApplierContext, 'name'>,
): boolean {
  const applier = registry.get(name)
  if (!applier) return false
  try {
    applier(value, { ...ctx, name })
  } catch (e) {
    console.warn(`fastquasar-settings: applier "${name}" non riuscito`, e)
  }
  return true
}

/**
 * Riporta tutti gli applier registrati al default (`source` `reset`): logout o cambio utente. Ogni applier riceve
 * come valore il default dello schema (`defaults[nome]`, anche `null`), oppure `undefined` se non ne ha uno.
 *
 * @param defaults - mappa nome applier -> default dello schema
 */
export function resetSettingsAppliers(defaults: Record<string, unknown> = {}): void {
  for (const name of registry.keys()) {
    runSettingsApplier(name, Object.hasOwn(defaults, name) ? defaults[name] : undefined, { source: 'reset' })
  }
}

/**
 * Applica le preferenze locali storiche (`pachi-prefs-accent|density`), usate dalla sezione "Aspetto" locale
 * quando il backend non ha la sezione `appearance`. Il tema è già gestito da `ToggleThemeButton`.
 */
export function applyLegacyLocalPrefs(): void {
  const accent = readStorage(ACCENT_STORAGE_KEY)
  const density = readStorage(DENSITY_STORAGE_KEY)
  if (accent) applyAccent(accent, { name: 'accent', source: 'cache' })
  if (density) applyDensity(density, { name: 'density', source: 'cache' })
}

/** Rimuove le preferenze locali storiche (pulsante "Reimposta" della sezione locale). */
export function clearLegacyLocalPrefs(): void {
  removeStorage(THEME_STORAGE_KEY)
  removeStorage(DENSITY_STORAGE_KEY)
  removeStorage(ACCENT_STORAGE_KEY)
}
