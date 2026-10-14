import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages: same keys as `it.ts` (a missing key is a compile error). */
const en: PachiMessages<typeof it> = {
  app: {
    routes: {
      login: {
        title: 'Login',
        description: 'Log in to the platform'
      }
    }
  },
  auth: {
    login: {
      meta: 'pachi / login',
      heading: 'Log in to your account',
      subtitle: 'Enter your credentials to sign in',
      username: 'Username',
      password: 'Password',
      submit: 'Log in',
      invalidCredentials: 'Invalid credentials.',
      help: 'Having trouble? Contact support'
    },
    lock: {
      countdown: 'Account locked, try again in {time}'
    },
    mfa: {
      heading: 'Two-step verification',
      subtitle: 'Enter the 6-digit code from your authenticator app, or a backup code',
      code: 'Code',
      verify: 'Verify',
      back: 'Back',
      codeInvalid: 'Invalid code. Please try again.',
      tooManyAttempts: 'Too many failed attempts. Please try again later.',
      expired: 'The verification has expired. Please sign in again.',
      unlocked: 'The account has been unlocked. Please sign in again.'
    }
  },
  menu: {
    profile: 'My Profile',
    profileCaption: 'Manage your personal data',
    settings: 'Settings',
    settingsCaption: 'Configure your preferences',
    home: 'Home',
    homeCaption: 'Back to the home page',
    databases: 'Databases',
    logout: 'Log out',
    account: 'Account Menu'
  },
  dashboard: {
    emptyTitle: 'Boilerplate ready',
    emptyDescription: 'Add new feature routes to populate this dashboard.',
    overviewCode: '00 · overview',
    overviewTitle: 'Overview',
    overviewSub: '· {count} sections',
    overviewDesc: 'Select a section to get started.',
    sectionCode: 'section · {title}',
    sectionSub: '· {count} tools',
    backToParent: 'Back to parent section'
  },
  errors: {
    notFound: {
      title: 'Page not found',
      description: 'The requested URL does not exist.',
      back: '← Back to home'
    },
    http: {
      title: 'Error: {status} - {statusText}',
      generic: 'An unexpected error occurred. Please try again later.',
      tooManyRequests: 'Too many requests. Please try again in a moment.'
    }
  },
  common: {
    goHome: 'Back to home',
    backTo: 'Back to: {label}',
    switchToLight: 'Switch to light theme',
    switchToDark: 'Switch to dark theme',
    loading: 'Loading...',
    copy: 'copy',
    ok: 'OK',
    home: 'Home',
    parentLevel: 'Parent level',
    toggleTheme: 'Toggle dark mode'
  }
}

export default en
