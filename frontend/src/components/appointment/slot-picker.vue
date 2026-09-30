<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import axiosInstance from '@/plugins/axios'

// Free/busy chips for one doctor on one day (GET /appointments/availability).
// Purely an aid next to the manual time input: the server re-checks on submit,
// so a failed lookup just hides the chips.
const props = defineProps<{
  doctorId?: string | number | null
  date?: string | null
  modelValue?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

interface Slot {
  time: string
  available: boolean
}

const slots = ref<Slot[]>([])
const loading = ref(false)
let requestId = 0

const isoDay = (value?: string | null) => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '')

watch(
  () => [props.doctorId, props.date] as const,
  async ([doctorId, date]) => {
    const day = isoDay(date)
    slots.value = []
    if (!doctorId || !day) return
    const current = ++requestId
    loading.value = true
    try {
      const { data } = await axiosInstance.get('/appointments/availability', { params: { doctorId, date: day } })
      if (current === requestId) slots.value = data?.slots ?? []
    } catch {
      if (current === requestId) slots.value = []
    } finally {
      if (current === requestId) loading.value = false
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="doctorId && isoDay(date)" class="space-y-2">
    <p class="text-xs font-medium text-muted-foreground">{{ t('appointment.slots.title') }}</p>
    <p v-if="loading" class="text-xs text-muted-foreground">{{ t('appointment.slots.loading') }}</p>
    <p v-else-if="!slots.length" class="text-xs text-muted-foreground">{{ t('appointment.slots.none') }}</p>
    <div v-else class="flex flex-wrap gap-1.5">
      <button
        v-for="slot in slots"
        :key="slot.time"
        type="button"
        class="rounded-md border px-2 py-1 text-xs font-medium transition"
        :class="[
          modelValue === slot.time ? 'border-accent bg-accent text-white' : 'border-slate-200 bg-white text-slate-700',
          slot.available ? 'hover:border-accent' : 'cursor-not-allowed line-through opacity-40'
        ]"
        :disabled="!slot.available"
        :aria-pressed="modelValue === slot.time"
        @click="emit('update:modelValue', slot.time)"
      >
        {{ slot.time }}
      </button>
    </div>
  </div>
</template>
