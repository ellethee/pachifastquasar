<template>
  <div class="pachi-sched-section q-pa-md">
    <q-toggle
      v-model="state.enabled"
      :label="t('pachiEditDialog.scheduler.enable')"
    />

    <div class="pachi-sched-calendar" :class="{ 'pachi-sched-calendar--disabled': !state.enabled }">
      <div
        v-for="h in DAY_HEADERS"
        :key="h"
        class="pachi-sched-hdr"
      >
        {{ h }}
      </div>

      <button
        v-for="day in calendarDays"
        :key="day.iso"
        type="button"
        class="pachi-sched-cell"
        :aria-label="day.iso"
        :aria-pressed="isSelected(day.iso)"
        :disabled="!state.enabled"
        :class="{
          'pachi-sched-cell--today': day.isToday,
          'pachi-sched-cell--selected': isSelected(day.iso),
          'pachi-sched-cell--past': day.isPast && !day.isToday,
        }"
        @click="toggleDate(day.iso)"
      >
        {{ day.num }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { useSection } from '../composables/useSection'
import { formatLocalDate } from '../utils/date'
import type { SchedulerState } from '../types/sections'
import { messages } from '../locales'

const { t } = usePachiI18n(messages)

const props = defineProps<{
  initialValue?: SchedulerState
}>()

const {
  state,
  reset,
  commit,
  getResults,
  hasChanges,
} = useSection<SchedulerState>({
  enabled: false,
  selectedDates: [],
}, { initialValue: () => props.initialValue })

// ── Calendar ─────────────────────────────────────────────────────────────────
const DAY_HEADERS = computed(() =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => t(`pachiEditDialog.scheduler.days.${d}`))
)

// "oggi" locale, riallineato quando la pagina torna visibile (cambio di giorno)
const todayStr = ref(formatLocalDate(new Date()))
function refreshToday() { todayStr.value = formatLocalDate(new Date()) }
onMounted(() => document.addEventListener('visibilitychange', refreshToday))
onUnmounted(() => document.removeEventListener('visibilitychange', refreshToday))

const calendarDays = computed(() => {
  const today = new Date(`${todayStr.value}T00:00:00`)
  // Find Monday of current week
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < 21; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = formatLocalDate(d)
    days.push({
      iso,
      num: d.getDate(),
      isToday: iso === todayStr.value,
      isPast: iso < todayStr.value,
    })
  }
  return days
})

function isSelected(iso: string) {
  return state.value.selectedDates?.includes(iso) ?? false
}

function toggleDate(iso: string) {
  const dates = state.value.selectedDates ?? []
  const idx = dates.indexOf(iso)
  if (idx >= 0) {
    state.value.selectedDates = dates.filter(d => d !== iso)
  } else {
    state.value.selectedDates = [...dates, iso]
  }
}

function validate() { return true }

defineExpose({
  reset,
  commit,
  getResults,
  hasChanges: () => hasChanges.value,
  validate,
  name: 'SchedulerSection',
})
</script>

<style lang="scss">
.pachi-sched-section {
  .q-toggle {
    margin-bottom: 12px;
  }
}

.pachi-sched-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  user-select: none;

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}

.pachi-sched-hdr {
  font-family: var(--pachi-font);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pachi-muted);
  text-align: center;
  padding-bottom: 4px;
}

.pachi-sched-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: var(--pachi-mono);
  font-size: 11px;
  color: var(--pachi-ink-2);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  padding: 0;
  transition: background-color 0.12s ease;

  &:hover {
    background: var(--pachi-surface-3);
  }

  &--past {
    color: var(--pachi-faint);
  }

  &--today {
    border: 1px solid var(--pachi-accent);
    background: var(--pachi-accent-soft);
    color: var(--pachi-accent-ink);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--pachi-accent);
    outline-offset: 1px;
  }

  &--selected {
    background: var(--pachi-accent) !important;
    color: var(--pachi-bg) !important;
    font-weight: 600;
    border-color: transparent;
  }
}
</style>
