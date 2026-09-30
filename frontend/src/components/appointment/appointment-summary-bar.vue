<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Compact single-line stats, e.g. "12 appointments · 8 confirmed · 2 pending
// · 1 cancelled". Deliberately not a card grid - see AppointmentSummaryBar's
// usage in CalendarView.vue for why (the brief this follows explicitly asks
// for a subtle inline line above the calendar, not another dashboard tile).
const props = defineProps<{
  summary: {
    pending?: number
    confirmed?: number
    canceled?: number
    rejected?: number
    missing?: number
  }
}>()

const segments = computed(() => {
  const s = props.summary
  const cancelled = (s.canceled ?? 0) + (s.rejected ?? 0)
  const total = (s.pending ?? 0) + (s.confirmed ?? 0) + cancelled + (s.missing ?? 0)

  return [
    { label: t('appointment.summary.appointments', { count: total }, total), tone: 'text-foreground font-medium', show: true },
    { label: t('appointment.summary.confirmed', { count: s.confirmed ?? 0 }), tone: 'text-success-dark', show: (s.confirmed ?? 0) > 0 },
    { label: t('appointment.summary.pending', { count: s.pending ?? 0 }), tone: 'text-warning-dark', show: (s.pending ?? 0) > 0 },
    { label: t('appointment.summary.cancelled', { count: cancelled }), tone: 'text-muted-foreground', show: cancelled > 0 },
    { label: t('appointment.summary.noShow', { count: s.missing ?? 0 }, s.missing ?? 0), tone: 'text-info-dark', show: (s.missing ?? 0) > 0 }
  ].filter((segment) => segment.show)
})
</script>

<template>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
    <template v-for="(segment, index) in segments" :key="segment.label">
      <span v-if="index > 0" class="text-muted-foreground/50" aria-hidden="true">&middot;</span>
      <span :class="segment.tone">{{ segment.label }}</span>
    </template>
  </p>
</template>
