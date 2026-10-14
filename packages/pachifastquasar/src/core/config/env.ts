import { resolveTitleAnimation } from '../dashboard/helpers/title-animation'
import type { PachiConfigInput, PachiEnv } from './types/app-config'

/** Valore di una variabile se impostata e non vuota (la prima disponibile tra gli alias), altrimenti `undefined`. */
function pick(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = value === undefined || value === null ? '' : String(value).trim()
    if (text !== '') return text
  }
  return undefined
}

/** Booleano da variabile: `'false'` = false, qualunque altro valore impostato = true, assente = `undefined`. */
function flag(...values: unknown[]): boolean | undefined {
  const value = pick(...values)
  return value === undefined ? undefined : value !== 'false'
}

/** Rimuove le chiavi `undefined` (ricorsivamente) e gli oggetti rimasti vuoti. */
function compact<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const inner = compact(item as Record<string, unknown>)
      if (Object.keys(inner).length > 0) out[key] = inner
      continue
    }
    out[key] = item
  }
  return out as T
}

/**
 * Mappa le variabili d'ambiente `QCLI_*` / `VITE_*` nella configurazione della shell. Va chiamata
 * dall'app con `import.meta.env`: i valori sono così letti dal build dell'app e non congelati nel pacchetto.
 *
 * Il risultato contiene SOLO le impostazioni per cui esiste una variabile non vuota: ciò che non è
 * impostato nell'ambiente è assente (non vale il default), così unito con {@link mergePachiConfig} o
 * {@link definePachiConfig} non sovrascrive la configurazione di base dell'app. Booleani: `false` solo se la
 * variabile vale esattamente `'false'` (`QCLI_APP_HIDE_HUB_HEADER`: vero solo con `'true'`).
 *
 * Variabili: `QCLI_AUTH_ENABLED`, `QCLI_AUTH_STORAGE` (`session`|`local`), `QCLI_AUTH_MENU_PROFILE|SETTINGS|HOME`,
 * `QCLI_APP_TITLE`, `QCLI_APP_DESCRIPTION`, `QCLI_APP_SHOW_LOGO`, `QCLI_APP_LOGO_SIZE`, `QCLI_APP_LOGO_OVERLAP`, `QCLI_APP_LOCALE`, `QCLI_APP_AUTO_DASHBOARD`,
 * `QCLI_APP_SHOW_LOCALE_SWITCHER`, `QCLI_APP_HIDE_HUB_HEADER`, `QCLI_APP_DASHBOARD_MAX_WIDTH`, `QCLI_APP_DASHBOARD_COLUMNS`, `QCLI_APP_TITLE_ANIMATION`, `QCLI_APP_GRAVATAR`, `QCLI_APP_HOVER_EFFECTS`,
 * `QCLI_HTTP_ENVELOPE` (`false` = il backend non usa l'envelope `{ success, message, data }`)
 * (e gli omologhi `VITE_AUTH_ENABLED`, `VITE_AUTH_MENU_*`, `VITE_APP_HOVER_EFFECTS`).
 *
 * @param env - tipicamente `import.meta.env`
 * @returns configurazione parziale (passabile a `setPachiConfig`, `createPachiApp`, `createPachiRouter`)
 */
export function pachiConfigFromEnv(env: PachiEnv): PachiConfigInput {
  const storage = pick(env.QCLI_AUTH_STORAGE)
  const hideHubHeader = pick(env.QCLI_APP_HIDE_HUB_HEADER)
  return compact({
    auth: {
      enabled: flag(env.QCLI_AUTH_ENABLED, env.VITE_AUTH_ENABLED),
      storage: storage === 'session' || storage === 'local' ? storage : undefined,
      menu: {
        showProfile: flag(env.QCLI_AUTH_MENU_PROFILE, env.VITE_AUTH_MENU_PROFILE),
        showSettings: flag(env.QCLI_AUTH_MENU_SETTINGS, env.VITE_AUTH_MENU_SETTINGS),
        showHome: flag(env.QCLI_AUTH_MENU_HOME, env.VITE_AUTH_MENU_HOME)
      }
    },
    app: {
      title: pick(env.QCLI_APP_TITLE),
      description: pick(env.QCLI_APP_DESCRIPTION),
      showAppLogo: flag(env.QCLI_APP_SHOW_LOGO),
      logoSize: pick(env.QCLI_APP_LOGO_SIZE),
      logoOverlap: flag(env.QCLI_APP_LOGO_OVERLAP),
      locale: pick(env.QCLI_APP_LOCALE),
      autoDashboard: flag(env.QCLI_APP_AUTO_DASHBOARD),
      showLocaleSwitcher: flag(env.QCLI_APP_SHOW_LOCALE_SWITCHER),
      hideHubHeader: hideHubHeader === undefined ? undefined : hideHubHeader === 'true',
      dashboardMaxWidth: pick(env.QCLI_APP_DASHBOARD_MAX_WIDTH),
      dashboardColumns: pick(env.QCLI_APP_DASHBOARD_COLUMNS),
      titleAnimation: resolveTitleAnimation(pick(env.QCLI_APP_TITLE_ANIMATION)),
      gravatar: flag(env.QCLI_APP_GRAVATAR),
      hoverEffectsEnabled: flag(env.QCLI_APP_HOVER_EFFECTS, env.VITE_APP_HOVER_EFFECTS)
    },
    http: {
      envelope: flag(env.QCLI_HTTP_ENVELOPE)
    }
  }) as PachiConfigInput
}
