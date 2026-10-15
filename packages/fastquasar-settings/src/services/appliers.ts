import { getPachiI18n, matchLocale } from '@ilpachi/pachi-i18n'
import { DENSITY_ATTRIBUTE, normalizeDensity } from '../helpers/density'
import { quasarDeps } from '../helpers/quasar-instance'
import { readStorage, removeStorage, writeStorage } from '../helpers/storage'

/** Where the applied value comes from. */
export type SettingsApplySource = 'cache' | 'load' | 'set' | 'reset'

/** Context passed to an applier. */
export interface ISettingsApplierContext {
  /** Name the applier is registered under. */
  name: string
  /** Setting category (absent for `reset`). */
  category?: string
  /** Setting key (absent for `reset`). */
  key?: string
  /**
   * Origin: `cache` (boot, from the user's cache), `load` (load from the backend), `set` (user
   * change), `reset` (logout or user change: the value is the schema `default`, also `null`, or
   * `undefined` if the schema has none; go back to the default).
   */
  source: SettingsApplySource
}

/**
 * Function that makes a value effective (theme, language, density, ...). It must be idempotent: it is called again
 * with the same value at boot, on load and on every change.
 */
export type SettingsApplier = (value: unknown, ctx: ISettingsApplierContext) => void

/** localStorage key that stores the theme (shared with the shell's `ToggleThemeButton`). */
export const THEME_STORAGE_KEY = 'pachi-prefs-theme'
/** localStorage key of the density (compatibility with the local "Appearance" section). */
export const DENSITY_STORAGE_KEY = 'pachi-prefs-density'
/** localStorage key of the accent (compatibility with the local "Appearance" section). */
export const ACCENT_STORAGE_KEY = 'pachi-prefs-accent'
/** localStorage key of the language (`@ilpachi/pachi-i18n`). */
export const LOCALE_STORAGE_KEY = 'pachi-prefs-locale'

/** `<html>` attribute for the text scale (`sm` | `md` | `lg`). */
export const FONT_SCALE_ATTRIBUTE = 'data-font-scale'
/** `<html>` attribute to reduce animations (`true`). */
export const REDUCE_MOTION_ATTRIBUTE = 'data-reduce-motion'

/** Accent colours: `accent` and `ink` (text/icons on a neutral background). */
export interface IAccentPreset {
  accent: string
  ink: string
}

/** Default accents. `teal` matches the default in `theme-defaults.scss` (no inline variable). */
export const ACCENT_PRESETS: Readonly<Record<string, IAccentPreset>> = {
  teal: { accent: '#2DD4BF', ink: '#2DD4BF' },
  indigo: { accent: '#818CF8', ink: '#818CF8' },
  amber: { accent: '#FBBF24', ink: '#FBBF24' },
  violet: { accent: '#A78BFA', ink: '#A78BFA' },
  coral: { accent: '#F87171', ink: '#F87171' },
}

/** CSS variables written on the root element by the `accent` applier. */
const ACCENT_VARIABLES = [
  '--pachi-accent',
  '--pachi-accent-soft',
  '--pachi-accent-mid',
  '--pachi-accent-ink',
  '--pachi-accent-deep',
] as const

/** Part of `HTMLElement` used by appliers (lets them be tested without a DOM). */
export interface ISettingsRoot {
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): unknown }
}

/** Root element (`<html>`), or `undefined` outside the browser. */
function getRoot(): ISettingsRoot | undefined {
  return (globalThis as { document?: { documentElement?: ISettingsRoot } }).document?.documentElement
}

/** Value as a string, or `undefined` if it is not a non-empty string. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

/**
 * Applier `theme`: `dark` | `light` | `auto` on `$q.dark`; copies the value to `pachi-prefs-theme`
 * (cache read by the shell's `ToggleThemeButton`). On `reset` it does nothing (the theme is a device choice).
 */
export const applyTheme: SettingsApplier = (value, ctx) => {
  if (ctx.source === 'reset') return
  const theme = value === 'light' || value === 'auto' ? value : 'dark'
  const dark = quasarDeps().Dark
  dark?.set(theme === 'auto' ? 'auto' : theme === 'dark')
  writeStorage(THEME_STORAGE_KEY, theme)
}

/**
 * Applier `accent`: sets the `--pachi-accent*` variables on the root element. An unknown accent, `teal`
 * or `reset` remove the variables (the theme defaults apply).
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

/** Applier `fontScale`: attributo `data-font-scale` (`sm` | `lg`; `md`, unknown values and `reset` remove it). */
export const applyFontScale: SettingsApplier = (value) => {
  const root = getRoot()
  if (!root) return
  if (value === 'sm' || value === 'lg') root.setAttribute(FONT_SCALE_ATTRIBUTE, value)
  else root.removeAttribute(FONT_SCALE_ATTRIBUTE)
}

/** Applier `reduceMotion`: attributo `data-reduce-motion="true"` (removed if `false`/`reset`). */
export const applyReduceMotion: SettingsApplier = (value) => {
  const root = getRoot()
  if (!root) return
  if (value === true) root.setAttribute(REDUCE_MOTION_ATTRIBUTE, 'true')
  else root.removeAttribute(REDUCE_MOTION_ATTRIBUTE)
}

/** Last language set by the applier (avoids writing back to the backend what comes from the backend). */
let lastAppliedLocale: string | undefined

/** Language last set by {@link applyLocale} (to tell the user's choices from the selector). */
export function getLastAppliedLocale(): string | undefined {
  return lastAppliedLocale
}

/**
 * Applier `locale`: changes the `@ilpachi/pachi-i18n` language (code, also regional: `it-IT` -> `it`).
 * `null`/empty = automatic (from `navigator.languages`). On `reset` it does nothing; without i18n or with a fixed language
 * (only one language available) it has no effect.
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

/** Applier registry (name -> function). */
const registry = new Map<string, SettingsApplier>()

/** Registers the standard appliers (called at startup and in tests). */
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
 * Registers (or replaces) a named applier: schema fields with `apply: "<name>"` will run it.
 * An applier registered with the name of a standard one replaces it.
 *
 * @param name - name used in `apply`
 * @param applier - function `(value, ctx) => void`
 * @returns function that undoes the registration (restores the standard applier, if any)
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

/** Names of the registered appliers. */
export function listSettingsAppliers(): string[] {
  return [...registry.keys()]
}

/**
 * Runs the `name` applier (if it exists). An applier error is logged to the console and does not stop the others.
 *
 * @param name - applier name
 * @param value - value to apply
 * @param ctx - context (without `name`)
 * @returns `true` if the applier exists
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
    console.warn(`fastquasar-settings: applier "${name}" failed`, e)
  }
  return true
}

/**
 * Resets all registered appliers to the default (`source` `reset`): logout or user change. Each applier receives
 * as value the schema default (`defaults[name]`, also `null`), or `undefined` if it has none.
 *
 * @param defaults - map applier name -> schema default
 */
export function resetSettingsAppliers(defaults: Record<string, unknown> = {}): void {
  for (const name of registry.keys()) {
    runSettingsApplier(name, Object.hasOwn(defaults, name) ? defaults[name] : undefined, { source: 'reset' })
  }
}

/**
 * Applies the legacy local preferences (`pachi-prefs-accent|density`), used by the local "Appearance" section
 * when the backend has no `appearance` section. The theme is already handled by `ToggleThemeButton`.
 */
export function applyLegacyLocalPrefs(): void {
  const accent = readStorage(ACCENT_STORAGE_KEY)
  const density = readStorage(DENSITY_STORAGE_KEY)
  if (accent) applyAccent(accent, { name: 'accent', source: 'cache' })
  if (density) applyDensity(density, { name: 'density', source: 'cache' })
}

/** Removes the legacy local preferences ("Reset" button of the local section). */
export function clearLegacyLocalPrefs(): void {
  removeStorage(THEME_STORAGE_KEY)
  removeStorage(DENSITY_STORAGE_KEY)
  removeStorage(ACCENT_STORAGE_KEY)
}
