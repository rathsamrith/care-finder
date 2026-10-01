<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="user.hospital != 'No hospital'">
    <SectionHeading :kicker="t('hospitalDash.calendar.kicker')">
      <template #title>{{ t('hospitalDash.calendar.title') }}</template>
      <template #subtitle>{{ t('hospitalDash.calendar.subtitle') }}</template>
    </SectionHeading>

    <AppointmentSummaryBar :summary="summary" class="mt-4" />

    <Card class="mt-4">
      <CardContent>
        <div class="cf-calendar">
          <FullCalendar :options="fullCalendarOptions as any">
            <template v-slot:eventContent="arg">
              <div class="flex items-center gap-1.5 overflow-hidden rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] leading-tight">
                <span class="size-1.5 shrink-0 rounded-full" :class="statusDotClass(arg.event.extendedProps.status)" />
                <b class="shrink-0 text-accent-dark">{{ formatAppointmentTime(arg.event.extendedProps.appointment_time) }}</b>
                <span class="truncate text-ink">
                  {{ t('hospitalDash.calendar.doctorPrefix') }} {{ arg.event.extendedProps.doctor?.first_name }}
                  <template v-if="arg.view.type !== 'dayGridMonth'">{{ arg.event.extendedProps.doctor?.last_name }}</template>
                </span>
              </div>
            </template>
            <template v-slot:dayCellContent="arg">
              <div class="flex w-full items-center justify-between">
                <span :class="arg.isToday ? 'font-semibold text-primary' : ''">{{ arg.dayNumberText }}</span>
                <span v-if="arg.isToday" class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                  {{ t('hospitalDash.calendar.today') }}
                </span>
              </div>
            </template>
          </FullCalendar>
        </div>
      </CardContent>
    </Card>
    <Dialog v-model:open="outerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.appointments.detailsTitle') }}</DialogTitle>
        </DialogHeader>
        <dl class="space-y-2 text-sm text-muted-foreground">
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.nameLabel') }}</b> {{ currentAppointment.extendedProps.user.first_name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.doctorLabel') }}</b> {{ currentAppointment.extendedProps.doctor.first_name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.hospitalLabel') }}</b> {{ currentAppointment.extendedProps.hospital.name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.phoneLabel') }}</b> {{ currentAppointment.extendedProps.user.phone_number }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.dateLabel') }}</b> {{ currentAppointment.start?.toISOString().split('T')[0] }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.timeLabel') }}</b> {{ formatAppointmentTime(currentAppointment.extendedProps.appointment_time) }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.calendar.roomLabel') }}</b> {{ currentAppointment.extendedProps.room?.name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.statusLabel') }}</b> {{ currentAppointment.extendedProps.status }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.genderLabel') }}</b> {{ currentAppointment.extendedProps.user.gender }}</p>
        </dl>
        <DialogFooter>
          <Button variant="outline" @click="outerVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button v-if="currentAppointment.extendedProps.status !== 'Confirmed'" @click="ConfirmAppointment">{{ t('hospitalDash.appointments.confirmAppointment') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="innerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.appointments.confirmAppointment') }}</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">{{ t('hospitalDash.appointments.areYouSure') }}</p>
        <DialogFooter>
          <Button variant="outline" @click="innerVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="submitConfirmation">{{ t('hospitalDash.appointments.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import kmLocale from '@fullcalendar/core/locales/km'
import i18n from '@/i18n'
import type { EventApi, DatesSetArg, EventClickArg } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth-store'
import { statusTone } from '@/lib/appointment-status'
import { formatAppointmentTime } from '@/lib/format'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import AppointmentSummaryBar from '@/components/appointment/appointment-summary-bar.vue'
const store = hospitalAppointmentListStore()
const userStore = useAuthStore()
const notifyAppointmentConfirmed = () => {
  toast.success(i18n.global.t('hospitalDash.appointments.statusUpdated'))
}
watch(
  () => store.message,
  (message) => {
    if (message && Object.keys(message).length > 0) {
      notifyAppointmentConfirmed()
    }
  }
)

const DOT_CLASS: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  neutral: 'bg-muted-foreground',
  destructive: 'bg-destructive',
  info: 'bg-info'
}

export default defineComponent({
  components: {
    NoHospitalSet,
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
    FullCalendar,
    AppointmentSummaryBar
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
      hospitalNavItems,
      outerVisible: ref(false),
      innerVisible: ref(false),
      id: '',
      appointment: [],
      user: userStore,
      currentAppointment: {} as any,
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
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents,
        datesSet: this.handleDatesSet
      },
      currentEvents: [] as EventApi[]
    }
  },
  computed: {
    // FullCalendar's `events` option needs to stay reactive to the store
    // (unlike `initialEvents`, which is only read once at creation - that
    // was the bug here: appointments were fetched into the store but never
    // reached the calendar, so it always rendered empty). Merged in on top
    // of the static calendarOptions rather than stored there directly,
    // since `store.calendars` changes after every fetch.
    fullCalendarOptions() {
      return {
        ...this.calendarOptions,
        locale: this.locale === 'km' ? kmLocale : 'en',
        buttonText: {
          today: this.t('hospitalDash.calendar.today'),
          month: this.t('hospitalDash.calendar.month'),
          week: this.t('hospitalDash.calendar.week'),
          day: this.t('hospitalDash.calendar.day')
        },
        events: store.calendars
      }
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
    handleEvents(events: EventApi[]) {
      this.currentEvents = events
    },
    handleDatesSet(arg: DatesSetArg) {
      // Also fires on the calendar's initial render, so this is the only
      // fetch trigger needed - no separate mounted() call for it. Refetches
      // whichever month/year the visible range now covers, so navigating
      // with prev/next actually loads that month instead of repeating
      // whatever was fetched on the very first render.
      const { currentStart } = arg.view
      this.visibleMonth = currentStart.getMonth() + 1
      this.visibleYear = currentStart.getFullYear()
      store.fetchCalendarData({ month: this.visibleMonth, year: this.visibleYear })
    },
    formatAppointmentTime,
    statusDotClass(status: string) {
      return DOT_CLASS[statusTone[status] ?? 'neutral']
    },
    ConfirmAppointment() {
      this.outerVisible = false
      this.innerVisible = true
    },
    async submitConfirmation() {
      this.innerVisible = false
      await store.confirmAppointment(this.id)
      await Promise.all([
        store.fetchAppointments(),
        store.fetchCalendarData({ month: this.visibleMonth, year: this.visibleYear }),
        store.fetchAppointmentSummary()
      ])
    }
  }
})
</script>

<style>
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
