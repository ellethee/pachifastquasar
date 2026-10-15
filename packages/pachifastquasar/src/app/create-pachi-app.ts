import type { App } from 'vue'
import type { Router } from 'vue-router'
import { createPachiI18n } from '@ilpachi/pachi-i18n'
import type { PachiMessageMap } from '@ilpachi/pachi-i18n'
import { setPachiConfig } from '../core/config'
import type { PachiConfigInput } from '../core/config'
import { createPachiHttp } from './create-http'
import { createPachiAvatarResolver, PACHI_AVATAR_URL_KEY } from '../helpers/avatar-resolver'
import { createPachiLogout, PACHI_LOGOUT_KEY } from '../helpers/logout-provider'
import { setPachiQuasar } from '../helpers/quasar-instance'
import { setQuasarLang } from '../i18n/quasar-lang'
import { pachiShellMessages } from '../i18n'

/** Part of the Quasar boot context used by the shell. */
export interface PachiAppContext {
  app: App
  router?: Router
}

/** Options of {@link createPachiApp}. */
export interface CreatePachiAppOptions {
  /** Shell configuration (typically `pachiConfigFromEnv(import.meta.env)` + customizations). */
  config?: PachiConfigInput
  /**
   * i18n messages per language (the offered languages are its keys). If omitted only the shell
   * messages are used; to include the app generated/overrides/features see `composePachiMessages`.
   */
  messages?: PachiMessageMap
}

/**
 * Installs the shell in the Vue app: configuration, HTTP client (`@ilpachi/use-alova`), i18n
 * (`@ilpachi/pachi-i18n`, with the Quasar language kept in sync) and the global theme classes.
 * Must be called in the app boot file (`defineBoot(ctx => createPachiApp(ctx, { ... }))`).
 *
 * @param ctx - boot context (`{ app, router }`)
 * @param options - see {@link CreatePachiAppOptions}
 */
export function createPachiApp(ctx: PachiAppContext, options: CreatePachiAppOptions = {}): void {
  const config = setPachiConfig(options.config)
  const { app } = ctx
  // Quasar plugins (Dialog, Notify, Loading) from the app instance, never imported from `quasar`
  setPachiQuasar(app.config.globalProperties.$q)

  const useAlova = createPachiHttp({ envelope: config.http.envelope })
  app.config.globalProperties.$useAlova = useAlova
  app.provide('useAlova', useAlova)
  // avatar (Gravatar or initials) for packages that do not import the shell, e.g. the profile page
  app.provide(PACHI_AVATAR_URL_KEY, createPachiAvatarResolver())
  // local logout (no backend calls) for packages, e.g. after a password change
  app.provide(PACHI_LOGOUT_KEY, createPachiLogout())

  app.use(
    createPachiI18n({
      messages: options.messages ?? pachiShellMessages,
      fixedLocale: config.app.locale,
      onLocaleChange: setQuasarLang
    })
  )

  if (config.app.hoverEffectsEnabled === false) {
    document.body.classList.add('pachi-hover-fx-disabled')
  }
}

/** Alias of {@link createPachiApp}. */
export const pachiBoot = createPachiApp
