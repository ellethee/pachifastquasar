import { defineBoot } from '#q-app'
import { AuthManager, composePachiMessages, createPachiApp } from '@ilpachi/pachifastquasar'
import { installPachiAdmin } from '@ilpachi/fastquasar-admin'
import {
  setPachiProfileEdit,
  setPachiProfileSecurity,
  setPachiProfileUser
} from '@ilpachi/fastquasar-profile'
import { pachiConfig } from 'src/pachi-config'

/** Boot: installs the shell (config, HTTP, i18n with the app's generated/overrides/features). */
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

  // Admin page: the app's HTTP client and menu entry (shown if the user sees at least one model)
  installPachiAdmin({ app: ctx.app })

  // profile page (`/user/profile`): session user, edit and password change (also used by the e2e suite)
  setPachiProfileUser(() => AuthManager.getInstance().userInfo)
  setPachiProfileEdit({ onUpdated: () => AuthManager.getInstance().refreshUserInfo() })
  setPachiProfileSecurity({ password: true })
})
