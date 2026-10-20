import { resolveTitleAnimation } from '../dashboard/helpers/title-animation'
import type { PachiConfigInput, PachiEnv, PachiRefreshMode } from './types/app-config'

/** Value of a variable if set and non-empty (the first available among the aliases), otherwise `undefined`. */
function pick(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = value === undefined || value === null ? '' : String(value).trim()
    if (text !== '') return text
  }
  return undefined
}

/** Boolean from a variable: `'false'` = false, any other set value = true, absent = `undefined`. */
function flag(...values: unknown[]): boolean | undefined {
  const value = pick(...values)
  return value === undefined ? undefined : value !== 'false'
}

/** Removes `undefined` keys (recursively) and objects left empty. */
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
 * Maps the `QCLI_*` / `VITE_*` environment variables into the shell configuration. It must be called
 * by the app with `import.meta.env`: values are thus read at the app build and not frozen in the package.
 *
 * The result contains ONLY the settings for which a non-empty variable exists: whatever is not
 * set in the environment is absent (the default does not apply), so when merged with {@link mergePachiConfig} or
 * {@link definePachiConfig} it does not overwrite the app's base configuration. Booleans: `false` only if the
 * variable is exactly `'false'` (`QCLI_APP_HIDE_HUB_HEADER`: true only with `'true'`).
 *
 * Variables: `QCLI_AUTH_ENABLED`, `QCLI_AUTH_STORAGE` (`session`|`local`),
 * `QCLI_AUTH_REFRESH_MODE` (`body`|`cookie`; other values: `body` + warning),
 * `QCLI_AUTH_MENU_PROFILE|SETTINGS|HOME`,
 * `QCLI_APP_TITLE`, `QCLI_APP_DESCRIPTION`, `QCLI_APP_SHOW_LOGO`, `QCLI_APP_LOGO_SIZE`, `QCLI_APP_LOGO_OVERLAP`, `QCLI_APP_LOCALE`, `QCLI_APP_AUTO_DASHBOARD`,
 * `QCLI_APP_SHOW_LOCALE_SWITCHER`, `QCLI_APP_HIDE_HUB_HEADER`, `QCLI_APP_DASHBOARD_MAX_WIDTH`, `QCLI_APP_DASHBOARD_COLUMNS`, `QCLI_APP_TITLE_ANIMATION`, `QCLI_APP_GRAVATAR`, `QCLI_APP_HOVER_EFFECTS`,
 * `QCLI_HTTP_ENVELOPE` (`false` = the backend does not use the envelope `{ success, message, data }`)
 * (and the equivalents `VITE_AUTH_ENABLED`, `VITE_AUTH_MENU_*`, `VITE_APP_HOVER_EFFECTS`).
 *
 * @param env - typically `import.meta.env`
 * @returns partial configuration (can be passed to `setPachiConfig`, `createPachiApp`, `createPachiRouter`)
 */
export function pachiConfigFromEnv(env: PachiEnv): PachiConfigInput {
  const storage = pick(env.QCLI_AUTH_STORAGE)
  const hideHubHeader = pick(env.QCLI_APP_HIDE_HUB_HEADER)
  return compact({
    auth: {
      enabled: flag(env.QCLI_AUTH_ENABLED, env.VITE_AUTH_ENABLED),
      storage: storage === 'session' || storage === 'local' ? storage : undefined,
      // validated (with a warning) by resolvePachiConfig
      refreshMode: pick(env.QCLI_AUTH_REFRESH_MODE) as PachiRefreshMode | undefined,
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
