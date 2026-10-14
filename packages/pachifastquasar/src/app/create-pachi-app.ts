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

/** Parte del contesto di boot di Quasar usata dalla shell. */
export interface PachiAppContext {
  app: App
  router?: Router
}

/** Opzioni di {@link createPachiApp}. */
export interface CreatePachiAppOptions {
  /** Configurazione della shell (tipicamente `pachiConfigFromEnv(import.meta.env)` + personalizzazioni). */
  config?: PachiConfigInput
  /**
   * Messaggi i18n per lingua (le lingue offerte sono le sue chiavi). Se omessi si usano i soli messaggi
   * della shell; per includere generated/overrides/features dell'app vedi `composePachiMessages`.
   */
  messages?: PachiMessageMap
}

/**
 * Installa la shell nell'app Vue: configurazione, client HTTP (`@ilpachi/use-alova`), i18n
 * (`@ilpachi/pachi-i18n`, con lingua di Quasar sincronizzata) e le classi globali di tema.
 * Va chiamata nel boot file dell'app (`defineBoot(ctx => createPachiApp(ctx, { ... }))`).
 *
 * @param ctx - contesto di boot (`{ app, router }`)
 * @param options - vedi {@link CreatePachiAppOptions}
 */
export function createPachiApp(ctx: PachiAppContext, options: CreatePachiAppOptions = {}): void {
  const config = setPachiConfig(options.config)
  const { app } = ctx
  // plugin di Quasar (Dialog, Notify, Loading) dall'istanza dell'app, mai importati da `quasar`
  setPachiQuasar(app.config.globalProperties.$q)

  const useAlova = createPachiHttp({ envelope: config.http.envelope })
  app.config.globalProperties.$useAlova = useAlova
  app.provide('useAlova', useAlova)
  // avatar (Gravatar o iniziali) per i package che non importano la shell, es. la pagina profilo
  app.provide(PACHI_AVATAR_URL_KEY, createPachiAvatarResolver())
  // logout locale (senza chiamate al backend) per i package, es. dopo il cambio password
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

/** Alias di {@link createPachiApp}. */
export const pachiBoot = createPachiApp
