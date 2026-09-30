<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// The queue ticket: what the patient sees on their phone and on the kiosk screen.
// Carries only a first name (kiosk screens are in public).
export interface Ticket {
  queueLabel: string | null
  patientFirstName?: string | null
  doctor?: string | null
  room?: string | null
  appointmentTime?: string
  peopleAhead?: number
  estimatedWaitMinutes?: number
  alreadyCheckedIn?: boolean
  hospital?: string
}

defineProps<{ ticket: Ticket; large?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div class="text-center" data-testid="ticket">
    <p :class="large ? 'text-2xl' : 'text-lg'" class="font-semibold text-ink">
      {{ t('checkin.ticket.title') }}<template v-if="ticket.patientFirstName">, {{ ticket.patientFirstName }}</template>
    </p>
    <p v-if="ticket.alreadyCheckedIn" class="mt-1 text-sm text-slate-500">{{ t('checkin.ticket.already') }}</p>

    <div class="mx-auto mt-4 max-w-sm rounded-2xl border border-accent/30 bg-accent-tint px-6 py-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-accent-dark">{{ t('checkin.ticket.queueNumber') }}</p>
      <p :class="large ? 'text-8xl' : 'text-6xl'" class="mt-1 font-mono font-bold leading-none text-accent-dark" data-testid="queue-label">
        {{ ticket.queueLabel }}
      </p>
    </div>

    <dl :class="large ? 'text-lg' : 'text-sm'" class="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-left">
      <template v-if="ticket.doctor">
        <dt class="text-slate-500">{{ t('checkin.ticket.doctor') }}</dt>
        <dd class="font-medium text-ink">{{ ticket.doctor }}</dd>
      </template>
      <dt class="text-slate-500">{{ t('checkin.ticket.room') }}</dt>
      <dd class="font-medium text-ink">{{ ticket.room || t('checkin.ticket.noRoom') }}</dd>
      <template v-if="ticket.appointmentTime">
        <dt class="text-slate-500">{{ t('checkin.ticket.time') }}</dt>
        <dd class="font-medium text-ink">{{ ticket.appointmentTime }}</dd>
      </template>
      <template v-if="ticket.peopleAhead !== undefined">
        <dt class="text-slate-500">{{ t('checkin.ticket.ahead') }}</dt>
        <dd class="font-medium text-ink">{{ ticket.peopleAhead }}</dd>
        <dt class="text-slate-500">{{ t('checkin.ticket.wait') }}</dt>
        <dd class="font-medium text-ink">~{{ t('checkin.ticket.minutes', { n: ticket.estimatedWaitMinutes ?? 0 }) }}</dd>
      </template>
    </dl>
    <p :class="large ? 'text-base' : 'text-xs'" class="mx-auto mt-4 max-w-sm text-slate-500">{{ t('checkin.ticket.estimate') }}</p>
  </div>
</template>
