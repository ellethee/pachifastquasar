import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/fastquasar-settings`. */
const en: PachiMessages<typeof it> = {
  pachiSettings: {
    pageTitle: 'User settings',
    description: 'Manage your user profile settings',
    menuLabel: 'Settings',
    menuCaption: 'Manage your user profile settings',
    sections: {
      profile: { label: 'Profile', desc: 'Personal data and password' },
      notifications: { label: 'Notifications', desc: 'Email, push and in-app' },
      editor: { label: 'Editor', desc: 'Rich text preferences' },
      database: { label: 'Database', desc: 'Default database' },
      appearance: { label: 'Appearance', desc: 'Theme, accent and density' },
      api: { label: 'API tokens', desc: 'Personal tokens and webhooks' },
    },
    themes: { dark: 'Dark', light: 'Light', auto: 'System' },
    accents: { teal: 'Teal', indigo: 'Indigo', amber: 'Amber', violet: 'Violet', coral: 'Coral' },
    densities: { comf: 'Comfortable · 40px rows', comp: 'Compact · 32px rows' },
    loading: 'Loading settings...',
    errorTitle: 'Loading error',
    errorDesc: 'The settings could not be loaded.',
    saveError: 'Save failed: the previous value was restored.',
    retry: 'Retry',
    appearance: 'Appearance',
    appearanceNote: 'saved in this browser',
    theme: 'Theme',
    accent: 'Accent color',
    density: 'Interface density',
    resetTitle: 'Reset local preferences',
    resetDesc: 'Removes theme, density and tweaks saved in localStorage. Does not affect the profile.',
    reset: 'Reset',
    localeAuto: 'Automatic',
    resetAppearanceTitle: "Reset appearance",
    resetAppearanceDesc: "Restores theme, accent, density, text size and motion to their defaults (saved to your profile).",
    emptyTitle: 'Section not configured',
    emptyDesc: 'This section has no settings available yet.',
  },
}

export default en
