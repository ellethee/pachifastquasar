import { mdiCalendarToday, mdiLock } from '@quasar/extras/mdi-v7'
import { markRaw } from 'vue'
import { pachiT } from '@ilpachi/pachi-i18n'
import type { ISectionDefinition, PermissionsState, SchedulerState } from '../types/sections'

import SchedulerSection from './SchedulerSection.vue'
import PermissionsSection from './PermissionsSection.vue'

/**
 * Sezioni DEMO incluse nel package (schedulazione e permessi), pensate come esempio e per i test:
 * un'app reale definisce le proprie `ISectionDefinition` e le passa a `PachiEditDialog`.
 */
export const sectionsRegistry: ISectionDefinition[] = [
  {
    key: 'scheduler',
    // getter: il titolo segue la lingua corrente (richiede che un componente del package sia già montato)
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
