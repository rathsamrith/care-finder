<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.calendar.kicker')">
      <template #title>{{ t('hospitalDetail.calendar.heading') }}</template>
    </SectionHeading>
    <Card padding="p-4 sm:p-6" class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm font-semibold text-ink">{{ monthLabel }}</span>
        <div class="flex flex-wrap gap-2">
          <UiButton variant="subtle" @click="shiftYear(-1)">{{ t('hospitalDetail.calendar.prevYear') }}</UiButton>
          <UiButton variant="subtle" @click="shiftMonth(-1)">{{ t('hospitalDetail.calendar.prevMonth') }}</UiButton>
          <UiButton variant="primary" @click="goToToday">{{ t('hospitalDetail.calendar.today') }}</UiButton>
          <UiButton variant="subtle" @click="shiftMonth(1)">{{ t('hospitalDetail.calendar.nextMonth') }}</UiButton>
          <UiButton variant="subtle" @click="shiftYear(1)">{{ t('hospitalDetail.calendar.nextYear') }}</UiButton>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-center text-xs font-semibold text-slate-500">
        <div v-for="day in WEEKDAY_KEYS" :key="day" class="bg-slate-50 py-2">{{ t(`hospitalDetail.calendar.weekdays.${day}`) }}</div>
      </div>
      <div class="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border-x border-b border-slate-200 bg-slate-200">
        <div
          v-for="cell in calendarCells"
          :key="cell.iso"
          class="min-h-24 space-y-1 bg-white p-1.5"
          :class="!cell.inCurrentMonth && 'bg-slate-50 text-slate-400'"
        >
          <p class="text-xs font-medium">{{ cell.day }}</p>
          <button
            v-for="(item, index) in appointmentsFor(cell.iso)"
            :key="index"
            type="button"
            class="block w-full"
            @click="alertMessage(item)"
          >
            <Badge v-if="item.user.id === currentUserId" tone="accent">{{ t('hospitalDetail.calendar.you') }}</Badge>
            <Badge v-else-if="item.status === 'Pending'" tone="gold">{{ t('hospitalDetail.calendar.booked') }}</Badge>
            <Badge v-else tone="danger">{{ t('hospitalDetail.calendar.booked') }}</Badge>
          </button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import Badge from '@/components/ui/badge.vue'
import UiButton from '@/components/ui/button.vue'

const { t, locale } = useI18n()

const props = defineProps<{
  appointments: any[]
  currentUserId: string | number
}>()

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const anchor = ref(new Date())

const monthLabel = computed(() => anchor.value.toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-US', { month: 'long', year: 'numeric' }))

const toIso = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const calendarCells = computed(() => {
  const year = anchor.value.getFullYear()
  const month = anchor.value.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    return {
      iso: toIso(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month
    }
  })
})

const appointmentsFor = (iso: string) => props.appointments.filter((item) => item.appointment_date === iso)

const shiftMonth = (delta: number) => {
  anchor.value = new Date(anchor.value.getFullYear(), anchor.value.getMonth() + delta, 1)
}
const shiftYear = (delta: number) => {
  anchor.value = new Date(anchor.value.getFullYear() + delta, anchor.value.getMonth(), 1)
}
const goToToday = () => {
  anchor.value = new Date()
}

const alertMessage = (message: any) => {
  toast.success(t('hospitalDetail.calendar.appointmentToast', { date: message.appointment_date }))
}
</script>
