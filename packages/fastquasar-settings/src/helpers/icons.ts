import {
  mdiAccount,
  mdiBell,
  mdiBug,
  mdiCog,
  mdiLock,
  mdiPalette,
  mdiShield,
  mdiTranslate,
  mdiTune,
} from '@quasar/extras/mdi-v7'

/**
 * Default map from the (Material-style) names sent by the backend to the imported mdi SVG paths.
 */
const DEFAULT_ICONS: Record<string, string> = {
  bug_report: mdiBug,
  tune: mdiTune,
  settings: mdiCog,
  person: mdiAccount,
  palette: mdiPalette,
  notifications: mdiBell,
  security: mdiShield,
  language: mdiTranslate,
  lock: mdiLock,
}

/** Mutable map: starts from the defaults and can be extended by the app. */
const iconMap: Record<string, string> = { ...DEFAULT_ICONS }

/**
 * Extends (or overrides) the name-to-icon map used by {@link resolveSettingsIcon}.
 * Values must be SVG paths (e.g. imported from `@quasar/extras/mdi-v7`).
 * @param map Backend name -> SVG path pairs.
 */
export function setPachiSettingsIcons(map: Record<string, string>): void {
  Object.assign(iconMap, map)
}

/**
 * Resolves an icon name received from the backend into a value usable by `q-icon`.
 * - `null`/empty: `undefined`;
 * - already valid SVG path (starts with `M`/`m`): returned as is;
 * - name present in the map: the corresponding SVG path;
 * - any other value (e.g. `mdi-xxx` or unknown names): `undefined` (no icon).
 * @param name Icon name sent by the backend.
 * @returns SVG path or `undefined`.
 */
export function resolveSettingsIcon(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  if (/^[Mm][\d\s.,-]/.test(name)) return name
  return Object.prototype.hasOwnProperty.call(iconMap, name) ? iconMap[name] : undefined
}
