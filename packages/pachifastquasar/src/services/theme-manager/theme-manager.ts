import { computed, shallowRef, ref, watch } from 'vue'
import { Dark, setCssVar } from 'quasar'
import type { ColorMode, ThemeDefinition, ThemeId } from './types/theme-manager'
import { PACHI_BUILTIN_THEMES } from './themes'
import { notifyPachiThemeChanged } from '../../helpers/auth-events'

/** localStorage key of the theme id. */
export const PACHI_THEME_ID_KEY = 'pachi-prefs-theme-id'
/** localStorage key of the color mode: the same used by `ToggleThemeButton` and `fastquasar-settings`. */
export const PACHI_THEME_MODE_KEY = 'pachi-prefs-theme'

const FALLBACK_THEME: ThemeId = 'slate'

const themeList = shallowRef<ThemeDefinition[]>(Object.values(PACHI_BUILTIN_THEMES))

/**
 * Adds (or replaces, by `id`) themes in the list offered by the selector. The CSS of a custom theme
 * (`body[data-theme='<id>']` rules) is provided by whoever registers it. Call it before `ThemeManager.init`
 * (or `createPachiApp`) so a persisted custom theme can be restored.
 *
 * @param themes - themes to register
 */
export function registerPachiThemes(themes: ThemeDefinition[]): void {
  const byId = new Map(themeList.value.map(t => [t.id, t]))
  for (const theme of themes) byId.set(theme.id, theme)
  themeList.value = [...byId.values()]
}

/**
 * Registered themes (built-in + custom).
 *
 * @returns the current list
 */
export function getPachiThemes(): ThemeDefinition[] {
  return themeList.value
}

/** Reads a localStorage key, `null` if unavailable. */
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Writes a localStorage key, ignoring quota/privacy errors. */
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/**
 * Theme manager (singleton): active theme and color mode, persisted in localStorage, applied as
 * `data-theme` attribute on `<body>`, Quasar dark mode and Quasar brand colors. Created by
 * `createPachiApp` only when `app.themes` is enabled.
 */
export class ThemeManager {
  private static instance: ThemeManager | undefined

  private initialized = false

  /** Active theme id. */
  public readonly activeThemeId = ref<ThemeId>(FALLBACK_THEME)
  /** Active color mode. */
  public readonly activeMode = ref<ColorMode>('auto')
  /** Active theme definition. */
  public readonly currentTheme = computed<ThemeDefinition>(
    () => this.findTheme(this.activeThemeId.value) ?? themeList.value[0]!
  )
  /** Registered themes (reactive). */
  public readonly themes = themeList
  /** True when the dark mode is effectively active (also in `auto`). */
  public readonly isDark = computed<boolean>(() => Dark.isActive)

  /** @returns the singleton */
  public static getInstance(): ThemeManager {
    ThemeManager.instance ??= new ThemeManager()
    return ThemeManager.instance
  }

  /** Forgets the singleton (tests). */
  public static reset(): void {
    ThemeManager.instance = undefined
  }

  /**
   * Restores the persisted theme/mode and applies them. Idempotent.
   *
   * @param options - `defaultTheme`: theme used when the user never chose one (default `slate`)
   */
  public init(options: { defaultTheme?: ThemeId | undefined } = {}): void {
    if (this.initialized) return
    this.initialized = true

    let fallback = options.defaultTheme ?? FALLBACK_THEME
    if (!this.findTheme(fallback)) {
      console.warn(`[pachi] unknown theme ${JSON.stringify(fallback)}: using '${FALLBACK_THEME}'`)
      fallback = FALLBACK_THEME
    }
    const stored = readStorage(PACHI_THEME_ID_KEY)
    this.activeThemeId.value = stored && this.findTheme(stored) ? stored : fallback

    const mode = readStorage(PACHI_THEME_MODE_KEY)
    if (mode === 'dark' || mode === 'light' || mode === 'auto') this.activeMode.value = mode
    else this.activeMode.value = Dark.mode === 'auto' ? 'auto' : Dark.isActive ? 'dark' : 'light'

    this.apply()
    // `auto` mode: the OS scheme can change at runtime, so the Quasar brand colors follow `Dark.isActive`
    watch(
      () => Dark.isActive,
      () => this.applyColors()
    )
  }

  /**
   * Chooses a theme (ignored if not registered) and persists it.
   *
   * @param themeId - theme id
   */
  public setTheme(themeId: ThemeId): void {
    if (!this.findTheme(themeId)) return
    this.activeThemeId.value = themeId
    writeStorage(PACHI_THEME_ID_KEY, themeId)
    this.apply()
  }

  /**
   * Chooses the color mode and persists it (same key as `ToggleThemeButton`).
   *
   * @param mode - `dark`, `light` or `auto`
   */
  public setMode(mode: ColorMode): void {
    this.activeMode.value = mode
    writeStorage(PACHI_THEME_MODE_KEY, mode)
    this.apply()
    if (mode !== 'auto') notifyPachiThemeChanged(mode)
  }

  /** Switches between dark and light. */
  public toggleMode(): void {
    this.setMode(Dark.isActive ? 'light' : 'dark')
  }

  /** Looks up a registered theme. */
  private findTheme(themeId: string): ThemeDefinition | undefined {
    return themeList.value.find(t => t.id === themeId)
  }

  /** Applies theme and mode to the DOM and to Quasar. */
  private apply(): void {
    const mode = this.activeMode.value
    Dark.set(mode === 'auto' ? 'auto' : mode === 'dark')
    const theme = this.currentTheme.value
    if (typeof document !== 'undefined') document.body.setAttribute('data-theme', theme.id)
    this.applyColors()
  }

  /** Sets the Quasar brand colors of the active theme for the effective (light/dark) mode. */
  private applyColors(): void {
    const theme = this.currentTheme.value
    const colors = Dark.isActive ? theme.colors.dark : theme.colors.light
    try {
      setCssVar('primary', colors.primary)
      setCssVar('secondary', colors.secondary)
      setCssVar('accent', colors.accent)
      setCssVar('positive', colors.positive)
      setCssVar('negative', colors.negative)
      setCssVar('info', colors.info)
      setCssVar('warning', colors.warning)
      setCssVar('dark', colors.dark)
      if (colors.darkPage) setCssVar('dark-page', colors.darkPage)
    } catch (err) {
      console.warn('[pachi] ThemeManager: could not set the Quasar CSS variables', err)
    }
  }
}
