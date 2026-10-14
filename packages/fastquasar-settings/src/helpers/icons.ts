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
 * Mappa di default dai nomi (stile Material) inviati dal backend ai path SVG mdi importati.
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

/** Mappa modificabile: parte dai default e può essere estesa dall'app. */
const iconMap: Record<string, string> = { ...DEFAULT_ICONS }

/**
 * Estende (o sovrascrive) la mappa nome-icona usata da {@link resolveSettingsIcon}.
 * I valori devono essere path SVG (es. importati da `@quasar/extras/mdi-v7`).
 * @param map Coppie nome backend -> path SVG.
 */
export function setPachiSettingsIcons(map: Record<string, string>): void {
  Object.assign(iconMap, map)
}

/**
 * Risolve il nome di un'icona ricevuta dal backend in un valore utilizzabile da `q-icon`.
 * - `null`/vuoto: `undefined`;
 * - path SVG già valido (inizia con `M`/`m`): restituito così com'è;
 * - nome presente nella mappa: path SVG corrispondente;
 * - qualsiasi altro valore (es. `mdi-xxx` o nomi sconosciuti): `undefined` (nessuna icona).
 * @param name Nome dell'icona inviato dal backend.
 * @returns Path SVG oppure `undefined`.
 */
export function resolveSettingsIcon(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  if (/^[Mm][\d\s.,-]/.test(name)) return name
  return Object.prototype.hasOwnProperty.call(iconMap, name) ? iconMap[name] : undefined
}
