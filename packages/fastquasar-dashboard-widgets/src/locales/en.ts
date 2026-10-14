import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

/** English messages of `@ilpachi/fastquasar-dashboard-widgets`. */
const en: PachiMessages<typeof it> = {
  pachiDashboardWidgets: {
    retry: 'Retry',
    activity: {
      error: '— failed to load',
      code: 'activity',
      title: 'Recent activity',
      empty: '— no recent activity',
    },
    system: {
      error: '— failed to load',
      code: 'system',
      title: 'System',
      empty: '— data not available',
      version: 'Version',
      environment: 'Environment',
      uptime: 'Uptime',
      status: 'Status',
      statusOk: 'Operational',
      statusWarn: 'Warning',
      statusError: 'Error',
    },
  },
}

export default en
