import { defineBoot } from '#q-app'
import { AuthManager, composePachiMessages, createPachiApp } from '@ilpachi/pachifastquasar'
import { installPachiAdmin } from '@ilpachi/fastquasar-admin'
import {
  setPachiProfileEdit,
  setPachiProfileSecurity,
  setPachiProfileUser
} from '@ilpachi/fastquasar-profile'
import { pachiConfig } from 'src/pachi-config'

/** Boot: installa la shell (config, HTTP, i18n con generated/overrides/feature dell'app). */
export default defineBoot(ctx => {
  createPachiApp(ctx, {
    config: pachiConfig,
    messages: composePachiMessages({
      generated: import.meta.glob('../i18n/generated/*.json', { eager: true, import: 'default' }),
      overrides: import.meta.glob('../i18n/overrides/*.{ts,json}', {
        eager: true,
        import: 'default'
      }),
      locales: import.meta.glob('../i18n/locales/*.ts', { eager: true, import: 'default' }),
      features: import.meta.glob('/src/features/**/locales/*.ts', {
        eager: true,
        import: 'default'
      })
    })
  })

  // pagina Admin: client HTTP dell'app e voce di menu (compare se l'utente vede almeno un modello)
  installPachiAdmin({ app: ctx.app })

  // pagina profilo (`/user/profile`): utente della sessione, modifica e cambio password (usati anche dalla suite e2e)
  setPachiProfileUser(() => AuthManager.getInstance().userInfo)
  setPachiProfileEdit({ onUpdated: () => AuthManager.getInstance().refreshUserInfo() })
  setPachiProfileSecurity({ password: true })
})
