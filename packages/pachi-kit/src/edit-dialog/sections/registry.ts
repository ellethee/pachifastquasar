import { mdiCalendarToday, mdiLock } from '@quasar/extras/mdi-v7'
import { markRaw } from 'vue'
import { pachiT } from '@ilpachi/pachi-i18n'
import type { ISectionDefinition, PermissionsState, SchedulerState } from '../types/sections'

import SchedulerSection from './SchedulerSection.vue'
import PermissionsSection from './PermissionsSection.vue'

/**
 * DEMO sections included in the package (scheduling and permissions), meant as an example and for tests:
 * a real app defines its own `ISectionDefinition`s and passes them to `PachiEditDialog`.
 */
export const sectionsRegistry: ISectionDefinition[] = [
  {
    key: 'scheduler',
    // getter: the title follows the current language (requires a component of the package to be already mounted)
    get title() { return pachiT('pachiEditDialog.sections.schedulerTitle') },
    icon: mdiCalendarToday,
    component: markRaw(SchedulerSection),
    order: 10,
    enabled: true,
    initialValue: {
      enabled: false,
      selectedDates: []
    } satisfies SchedulerState
  },
  {
    key: 'permissions',
    get title() { return pachiT('pachiEditDialog.sections.permissionsTitle') },
    icon: mdiLock,
    component: markRaw(PermissionsSection),
    order: 20,
    enabled: true,
    initialValue: {
      roles: [],
      users: []
    } satisfies PermissionsState
  }
]
