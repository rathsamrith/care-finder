<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { XIcon } from '@lucide/vue'
import { formatAppointmentDate, formatAppointmentTime } from '@/lib/format'
import AppointmentStatusBadge from './appointment-status-badge.vue'

// `appointment` mirrors the shape CalendarView.vue already passes around from
// FullCalendar's eventClick (a FullCalendar EventApi: start/end + whatever
// was put in extendedProps when the event was built) - kept as `any` since
// FullCalendar doesn't export a type for the custom extendedProps shape this
// app uses.
const { t } = useI18n()

const props = defineProps<{
  open: boolean
  appointment: any
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const extended = computed(() => props.appointment?.extendedProps ?? {})
const dateLabel = computed(() => formatAppointmentDate(props.appointment?.start))
</script>

<template>
  <Sheet :open="open" @update:open="(value) => emit('update:open', value)">
    <SheetContent class="flex flex-col" :show-close-button="false">
      <SheetHeader>
        <div class="flex items-center gap-2">
          <SheetTitle class="flex-1">{{ t('appointment.details.title') }}</SheetTitle>
          <AppointmentStatusBadge v-if="extended.status" :status="extended.status" />
          <SheetClose as-child>
            <Button variant="ghost" size="icon-sm">
              <XIcon />
              <span class="sr-only">{{ t('appointment.details.close') }}</span>
            </Button>
          </SheetClose>
        </div>
      </SheetHeader>

      <dl class="flex-1 space-y-3 px-4 text-sm text-muted-foreground">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.patient') }}</dt>
          <dd class="text-foreground">{{ extended.user?.first_name }} {{ extended.user?.last_name }}</dd>
        </div>
        <div v-if="extended.user?.phone_number">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.phone') }}</dt>
          <dd class="text-foreground">{{ extended.user?.phone_number }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.doctor') }}</dt>
          <dd class="text-foreground">{{ extended.doctor?.first_name }} {{ extended.doctor?.last_name }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.hospital') }}</dt>
          <dd class="text-foreground">{{ extended.hospital?.name }}</dd>
        </div>
        <div class="flex gap-6">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.date') }}</dt>
            <dd class="text-foreground">{{ dateLabel }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.time') }}</dt>
            <dd class="text-foreground">{{ formatAppointmentTime(extended.appointment_time) }}</dd>
          </div>
        </div>
        <div v-if="extended.room?.name">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.room') }}</dt>
          <dd class="text-foreground">{{ extended.room?.name }}</dd>
        </div>
        <div v-if="extended.user?.gender">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{{ t('appointment.details.gender') }}</dt>
          <dd class="text-foreground">{{ extended.user?.gender }}</dd>
        </div>
      </dl>

      <SheetFooter class="flex-row justify-end gap-2">
        <Button variant="outline" @click="emit('update:open', false)">{{ t('appointment.details.close') }}</Button>
        <Button v-if="extended.status === 'Pending'" @click="emit('confirm')">{{ t('appointment.details.confirm') }}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
