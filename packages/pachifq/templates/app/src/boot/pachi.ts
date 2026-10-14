import { defineBoot } from '#q-app'
import { composePachiMessages, createPachiApp{{bootShellImports}} } from '@ilpachi/pachifastquasar'
{{bootImports}}import { pachiConfig } from 'src/pachi-config'

/** Boot: installs the shell (config, HTTP, i18n with the app's generated/overrides/feature messages). */
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
{{bootSetup}}})
