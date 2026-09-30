<script setup lang="ts">
import { CalendarIcon } from '@lucide/vue'
import { DateFormatter, type DateValue, getLocalTimeZone, parseDate } from '@internationalized/date'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Bridges the app's plain 'YYYY-MM-DD' string fields (used throughout every
// form/DTO in this codebase) to the Calendar primitive's @internationalized/date
// DateValue objects - so call sites keep using plain strings, unaware of the
// conversion underneath.
const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const { t } = useI18n()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const formatter = new DateFormatter('en-US', { dateStyle: 'medium' })

const value = computed<DateValue | undefined>({
  get: () => (props.modelValue ? parseDate(props.modelValue) : undefined),
  set: (next) => emit('update:modelValue', next ? next.toString() : '')
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn('w-full justify-start text-left font-normal', !modelValue && 'text-muted-foreground')"
      >
        <CalendarIcon class="mr-2 size-4" />
        {{ value ? formatter.format(value.toDate(getLocalTimeZone())) : (placeholder ?? t('ui.pickDate')) }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="value" />
    </PopoverContent>
  </Popover>
</template>
