<template>
  <DashboardLayout :nav-items="doctorNavItems" :portal-label="t('doctorDash.portal')">
    <SectionHeading :kicker="t('doctorDash.calendar.kicker')">
      <template #title>{{ t('doctorDash.calendar.title') }}</template>
      <template #subtitle>{{ t('doctorDash.calendar.subtitle') }}</template>
      <template #action>
        <Button size="sm" @click="openNewAppointment()">
          <PlusIcon />
          {{ t('doctorDash.calendar.newAppointment') }}
        </Button>
      </template>
    </SectionHeading>

    <AppointmentSummaryBar :summary="summary" class="mt-4" />

    <Card class="mt-4">
      <CardContent>
        <div class="cf-calendar">
          <FullCalendar ref="calendarRef" :options="fullCalendarOptions">
            <template v-slot:eventContent="arg">
              <div class="flex items-center gap-1.5 overflow-hidden rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] leading-tight">
                <span class="size-1.5 shrink-0 rounded-full" :class="statusDotClass(arg.event.extendedProps.status)" />
                <b class="shrink-0 text-accent-dark">{{ formatAppointmentTime(arg.event.extendedProps.appointment_time) }}</b>
                <span class="truncate text-ink">
                  {{ arg.event.extendedProps.user?.first_name }}
                  <template v-if="arg.view.type !== 'dayGridMonth'">{{ arg.event.extendedProps.user?.last_name }}</template>
                </span>
              </div>
            </template>
            <template v-slot:dayCellContent="arg">
              <div class="flex w-full items-center justify-between">
                <span :class="arg.isToday ? 'font-semibold text-primary' : ''">{{ arg.dayNumberText }}</span>
                <span v-if="arg.isToday" class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                  {{ t('doctorDash.calendar.today') }}
                </span>
              </div>
            </template>
          </FullCalendar>
        </div>
      </CardContent>
    </Card>

    <AppointmentDetailsSheet
      :open="outerVisible"
      :appointment="currentAppointment"
      @update:open="outerVisible = $event"
      @confirm="ConfirmAppointment"
    />

    <Dialog v-model:open="innerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('doctorDash.calendar.confirmTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">{{ t('doctorDash.calendar.endDate') }}</label>
            <DatePicker v-model="confirmData.appointment_end" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">{{ t('doctorDash.calendar.selectRoom') }}</label>
            <Select v-model="confirmData.room_name">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('doctorDash.calendar.selectRoom')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="hosp in rooms" :key="hosp.id" :value="hosp.name">{{ hosp.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="innerVisible = false">{{ t('doctorDash.calendar.cancel') }}</Button>
          <Button @click="submitConfirmation">{{ t('doctorDash.calendar.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <NewAppointmentDialog
      :open="newAppointmentVisible"
      :prefill-date="newAppointmentPrefillDate"
      :prefill-time="newAppointmentPrefillTime"
      @update:open="newAppointmentVisible = $event"
      @created="handleAppointmentCreated"
    />
  </DashboardLayout>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import kmLocale from '@fullcalendar/core/locales/km'
import i18n from '@/i18n'
import type { DatesSetArg, DateSelectArg, EventApi, EventClickArg } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { doctorNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { PlusIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import { statusTone } from '@/lib/appointment-status'
import { formatAppointmentTime } from '@/lib/format'
import AppointmentSummaryBar from '@/components/appointment/appointment-summary-bar.vue'
import AppointmentDetailsSheet from '@/components/appointment/appointment-details-sheet.vue'
import NewAppointmentDialog from '@/components/appointment/new-appointment-dialog.vue'

const store = hospitalAppointmentListStore()

const DOT_CLASS: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  neutral: 'bg-muted-foreground',
  destructive: 'bg-destructive',
  info: 'bg-info'
}

export default defineComponent({
  components: {
    DashboardLayout,
    SectionHeading,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    DatePicker,
    FullCalendar,
    PlusIcon,
    AppointmentSummaryBar,
    AppointmentDetailsSheet,
    NewAppointmentDialog
  },
  setup() {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  mounted() {
    store.fetchAppointmentSummary()
  },
  data() {
    return {
      doctorNavItems,
      outerVisible: ref(false),
      innerVisible: ref(false),
      newAppointmentVisible: ref(false),
      newAppointmentPrefillDate: '',
      newAppointmentPrefillTime: '',
      hospital: hospitalDetailStore(),
      id: '',
      appointment: [],
      currentAppointment: {
        appointment_date: undefined
      },
      confirmData: ref({
        appointment_id: '',
        appointment_end: '',
        room_name: ''
      }),
      visibleMonth: undefined as number | undefined,
      visibleYear: undefined as number | undefined,
      calendarOptions: {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        initialView: 'dayGridMonth',
        // appointmentTime is a wall-clock value stored on a fixed UTC epoch
        // (see AppointmentsService.combineDateAndTime) - it's not a real
        // instant, so FullCalendar must read it as literal UTC digits rather
        // than converting through the viewer's local offset. Without this,
        // week/day view positions every event at its UTC hour shifted by the
        // browser's local timezone (e.g. 2:30pm rendering down near 9-10pm
        // for an ICT/UTC+7 viewer) even though the label still reads 2:30pm.
        timeZone: 'UTC',
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        nowIndicator: true,
        select: this.handleDateSelect,
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents,
        datesSet: this.handleDatesSet
      },
      currentEvents: [] as EventApi[]
    }
  },
  computed: {
    // FullCalendar's own `events` option needs to stay reactive to the store
    // (unlike `initialEvents`, which is only read once at creation - the
    // previous bug here: appointments were fetched into the store but never
    // reached the calendar). Merged in on top of the static calendarOptions
    // rather than stored there directly, since `store.calendars` changes
    // after every fetch.
    fullCalendarOptions() {
      return {
        ...this.calendarOptions,
        locale: this.locale === 'km' ? kmLocale : 'en',
        buttonText: {
          today: this.t('doctorDash.calendar.today'),
          month: this.t('doctorDash.calendar.month'),
          week: this.t('doctorDash.calendar.week'),
          day: this.t('doctorDash.calendar.day')
        },
        events: store.calendars
      }
    },
    rooms() {
      return (this.hospital.hospitalDetail as any)?.rooms ?? []
    },
    summary() {
      return store.appointmentSummary as Record<string, number>
    }
  },
  methods: {
    handleWeekendsToggle() {
      this.calendarOptions.weekends = !this.calendarOptions.weekends
    },
    handleEventClick(clickInfo: EventClickArg) {
      this.outerVisible = true
      this.id = clickInfo.event.id
      this.currentAppointment = clickInfo.event
    },
    handleDateSelect(selectInfo: DateSelectArg) {
      const calendarApi = selectInfo.view.calendar
      calendarApi.unselect()
      const [datePart, timePart] = selectInfo.startStr.split('T')
      this.newAppointmentPrefillDate = datePart
      this.newAppointmentPrefillTime = timePart ? timePart.slice(0, 5) : ''
      this.newAppointmentVisible = true
    },
    handleEvents(events: EventApi[]) {
      this.currentEvents = events
    },
    handleDatesSet(arg: DatesSetArg) {
      const { currentStart } = arg.view
      this.visibleMonth = currentStart.getMonth() + 1
      this.visibleYear = currentStart.getFullYear()
      store.fetchCalendarData({ month: this.visibleMonth, year: this.visibleYear })
    },
    refetchVisibleMonth() {
      return store.fetchCalendarData({ month: this.visibleMonth, year: this.visibleYear })
    },
    formatAppointmentTime,
    statusDotClass(status: string) {
      return DOT_CLASS[statusTone[status] ?? 'neutral']
    },
    openNewAppointment() {
      this.newAppointmentPrefillDate = ''
      this.newAppointmentPrefillTime = ''
      this.newAppointmentVisible = true
    },
    async handleAppointmentCreated() {
      await Promise.all([this.refetchVisibleMonth(), store.fetchAppointmentSummary()])
    },
    ConfirmAppointment() {
      this.hospital.fetchHospitalDetail(this.currentAppointment.extendedProps.hospital.id)
      this.outerVisible = false
      this.innerVisible = true
    },
    async submitConfirmation() {
      this.innerVisible = false
      await store.confirmAppointment(this.id)
      await Promise.all([store.fetchAppointments(), this.refetchVisibleMonth(), store.fetchAppointmentSummary()])
      toast.success(i18n.global.t('doctorDash.calendar.confirmed'))
    }
  }
})
</script>

<style>
/* Scoped to .cf-calendar only - Hospital/User portal calendars keep
   FullCalendar's stock look until they opt into this class too. */
.cf-calendar {
  --fc-border-color: theme('colors.border');
  --fc-today-bg-color: theme('colors.accent.tint');
  --fc-neutral-bg-color: theme('colors.muted.DEFAULT');
  --fc-page-bg-color: transparent;
}
.cf-calendar .fc-toolbar {
  flex-wrap: wrap;
  gap: 0.75rem;
}
.cf-calendar .fc-toolbar-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: theme('colors.ink');
}
.cf-calendar .fc-button {
  padding: 0.3rem 0.65rem;
  font-size: 0.8125rem;
  font-weight: 500;
  box-shadow: none !important;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}
.cf-calendar .fc-button-primary {
  background-color: theme('colors.card.DEFAULT');
  border-color: theme('colors.border');
  color: theme('colors.ink');
}
.cf-calendar .fc-button-primary:hover {
  background-color: theme('colors.accent.tint');
  color: theme('colors.accent.dark');
}
.cf-calendar .fc-button-primary:not(:disabled).fc-button-active {
  background-color: theme('colors.accent.DEFAULT');
  border-color: theme('colors.accent.DEFAULT');
  color: white;
}
.cf-calendar .fc-daygrid-day-frame {
  padding: 2px;
}
.cf-calendar .fc-daygrid-day-top {
  padding: 2px 4px;
}
.cf-calendar .fc-day-today {
  background-color: var(--fc-today-bg-color) !important;
}
.cf-calendar .fc-daygrid-day:hover {
  background-color: theme('colors.muted.DEFAULT');
  transition: background-color 150ms ease;
}
.cf-calendar .fc-event {
  border: none;
  background: transparent;
  transition: opacity 150ms ease;
}
.cf-calendar .fc-event:hover {
  opacity: 0.8;
}
.cf-calendar .fc-now-indicator-line {
  border-color: theme('colors.accent.DEFAULT');
}

@media (max-width: 640px) {
  .cf-calendar .fc-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .cf-calendar .fc-toolbar-chunk {
    display: flex;
    justify-content: center;
  }
}
</style>
