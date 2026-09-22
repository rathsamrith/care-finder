<script setup lang="ts">
import { PlusIcon, XIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'

// Weekly working hours for one doctor (GET/PUT /doctors/:id/schedule).
// No day switched on = no custom schedule = bookings follow the hospital's hours.
const props = defineProps<{ doctorId: number | string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()

interface Interval {
  start: string
  end: string
}
interface Day {
  weekday: number
  enabled: boolean
  intervals: Interval[]
}

const MAX_INTERVALS = 4
const DEFAULT_INTERVAL: Interval = { start: '08:00', end: '17:00' }
// Shown Monday-first; values match the API (0 = Sunday ... 6 = Saturday).
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const days = ref<Day[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const blank = (): Day[] => ORDER.map((weekday) => ({ weekday, enabled: false, intervals: [] }))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await axiosInstance.get(`/doctors/${props.doctorId}/schedule`)
    const week = blank()
    for (const d of data.days ?? []) {
      const target = week.find((w) => w.weekday === d.weekday)
      if (target && d.intervals?.length) {
        target.enabled = true
        target.intervals = d.intervals.map((i: Interval) => ({ start: i.start, end: i.end }))
      }
    }
    days.value = week
  } catch (e) {
    days.value = blank()
    error.value = apiErrorMessage(e, t('schedule.loadFailed'))
  } finally {
    loading.value = false
  }
}
watch(() => props.doctorId, load, { immediate: true })

const toggle = (day: Day) => {
  day.enabled = !day.enabled
  day.intervals = day.enabled ? [{ ...DEFAULT_INTERVAL }] : []
}
const addInterval = (day: Day) => {
  if (day.intervals.length >= MAX_INTERVALS) return
  const last = day.intervals[day.intervals.length - 1]
  day.intervals.push(last ? { start: last.end, end: last.end } : { ...DEFAULT_INTERVAL })
}
const removeInterval = (day: Day, index: number) => {
  day.intervals.splice(index, 1)
  if (!day.intervals.length) day.enabled = false
}

const anyDay = computed(() => days.value.some((d) => d.enabled))

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    await axiosInstance.put(`/doctors/${props.doctorId}/schedule`, {
      days: days.value.filter((d) => d.enabled).map((d) => ({ weekday: d.weekday, intervals: d.intervals }))
    })
    toast.success(t('schedule.saved'))
    emit('saved')
  } catch (e) {
    error.value = apiErrorMessage(e, t('schedule.saveFailed'))
  } finally {
    saving.value = false
  }
}

const timeClass = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'
</script>

<template>
  <div class="space-y-3">
    <p v-if="loading" class="text-sm text-slate-500">{{ t('site.loading') }}</p>

    <template v-else>
      <ul class="divide-y divide-slate-100">
        <li v-for="day in days" :key="day.weekday" class="flex flex-wrap items-start gap-3 py-2.5">
          <label class="flex w-28 items-center gap-2 pt-1.5 text-sm font-medium text-slate-700">
            <input type="checkbox" class="size-4" :checked="day.enabled" @change="toggle(day)" />
            {{ t(`hospitalDetail.calendar.weekdays.${KEYS[day.weekday]}`) }}
          </label>

          <div v-if="day.enabled" class="flex-1 space-y-2">
            <div v-for="(interval, index) in day.intervals" :key="index" class="flex items-center gap-2">
              <input v-model="interval.start" type="time" required :class="timeClass" :aria-label="t('schedule.start')" />
              <span class="text-slate-400">–</span>
              <input v-model="interval.end" type="time" required :class="timeClass" :aria-label="t('schedule.end')" />
              <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('schedule.removeHours')" @click="removeInterval(day, index)">
                <XIcon />
              </Button>
            </div>
            <Button
              v-if="day.intervals.length < MAX_INTERVALS"
              type="button"
              variant="ghost"
              size="sm"
              @click="addInterval(day)"
            >
              <PlusIcon />{{ t('schedule.addHours') }}
            </Button>
          </div>
          <span v-else class="pt-1.5 text-sm text-slate-400">{{ t('schedule.off') }}</span>
        </li>
      </ul>

      <p v-if="!anyDay" class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{{ t('schedule.noDays') }}</p>
      <p v-if="error" class="rounded-lg bg-danger-light p-3 text-sm text-danger" role="alert">{{ error }}</p>

      <Button type="button" :disabled="saving" @click="save">{{ saving ? t('schedule.saving') : t('schedule.save') }}</Button>
    </template>
  </div>
</template>
