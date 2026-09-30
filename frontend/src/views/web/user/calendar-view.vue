<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EventApi, DateSelectArg, EventClickArg } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { translateStatus } from '@/lib/appointment-status'
import kmLocale from '@fullcalendar/core/locales/km'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth-store'
import axiosInstance from '@/plugins/axios'
import { socketConstance } from '@/plugins/socket'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import SlotPicker from '@/components/appointment/slot-picker.vue'
import { apiErrorMessage } from '@/lib/api-error'

const userStore = useAuthStore()
const store = hospitalAppointmentListStore()
const open2 = (_title: string, message: any, type: 'success' | 'warning' | 'error' | 'info') => {
  toast[type](message)
}
export default defineComponent({
  components: {
    SlotPicker,
    WebLayout,
    SectionHeading,
    Card,
    UiButton,
    FullCalendar,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    DatePicker
  },
  setup() {
    const { t, locale } = useI18n()
    return { t, locale, translateStatus }
  },
  mounted() {
    store.fetchCalendarData()
    this.fetchHospitals()
    socketConstance.on('appointment-status-changed', this.handleRealtimeAppointmentUpdate)
  },
  unmounted() {
    socketConstance.off('appointment-status-changed', this.handleRealtimeAppointmentUpdate)
  },
  data() {
    return {
      dialogTableVisible: ref(false),
      outerVisible: ref(false),
      innerVisible: ref(false),
      dialogEditVisible: ref(false),
      hospital: ref([]),
      events: [],
      docData: ref([]),
      hospital_id: '',
      form: reactive({
        first_name: userStore.user.first_name,
        last_name: userStore.user.last_name,
        user_id: userStore.user.id,
        hospital_id: '',
        doctor_id: '',
        title: '',
        date1: '',
        date2: ''
      }),
      formEdit: reactive({
        id: '',
        first_name: '',
        last_name: '',
        user_id: userStore.user.id,
        hospital_id: '',
        doctor_id: '',
        title: '',
        date1: '',
        date2: ''
      }),
      id: '',
      appointment: [],
      currentAppointment: {
        appointment_date: undefined
      },
      calendarOptions: {
        plugins: [
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin // needed for dateClick
        ],
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
        select: this.handleDateSelect,
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents
      },
      currentEvents: [] as EventApi[]
    }
  },
  computed: {
    // Merged on top of the static options so the calendar follows the language
    // switcher and the store: `events` stays reactive (the old `initialEvents`
    // was only read once, so appointments fetched after mount never showed).
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
    }
  },
  methods: {
    handleRealtimeAppointmentUpdate(data: unknown) {
      if (data) this.fetchData()
    },
    async onUpdate() {
      this.dialogEditVisible = false
      const payload = {
        appointmentDate: this.formEdit.date1,
        appointmentTime: this.formEdit.date2,
        title: this.formEdit.title
      }
      try {
        const { data } = await axiosInstance.put(`/appointments/update/${this.formEdit.id}`, payload)
        console.log(data)
        open2(this.t('userCalendar.toastTitle'), this.t('userCalendar.updated'), 'success')
        await store.fetchCalendarData()
      } catch (error) {
        open2(this.t('userCalendar.toastTitle'), this.t('userCalendar.updateFailed'), 'warning')
        console.log(error)
      }
    },
    async getDoctors(id: any) {
      console.log(id)
      try {
        const { data } = await axiosInstance.get(`/hospitals/show/${id}`)
        this.docData = data.doctors
      } catch (error) {
        console.log(error)
      }
    },
    openEditDialog(row: any) {
      console.log(row.extendedProps.appointment_time.toLocaleString())
      this.formEdit.id = row.id
      this.formEdit.first_name = row.extendedProps.user.first_name
      this.formEdit.last_name = row.extendedProps.user.last_name
      this.formEdit.user_id = row.extendedProps.user.id
      this.formEdit.title = row.title
      this.formEdit.date1 = row.startStr
      this.formEdit.date2 = row.extendedProps.appointment_time
      this.formEdit.hospital_id = row.extendedProps.hospital.id
      this.formEdit.doctor_id = row.extendedProps.doctor.id
      this.getDoctors(row.extendedProps.hospital.id)
      this.outerVisible = false
      this.dialogEditVisible = true
    },
    async onSubmit() {
      this.dialogTableVisible = false
      const payload = {
        appointmentDate: this.form.date1,
        appointmentTime: this.form.date2,
        hospitalId: this.form.hospital_id,
        title: this.form.title,
        doctorId: this.form.doctor_id
      }
      try {
        const { data } = await axiosInstance.post('/appointments/create', payload)
        console.log(data)
        await store.fetchCalendarData()
      } catch (error) {
        // Previously swallowed silently - a rejected slot looked like nothing happened.
        open2(this.t('userCalendar.toastTitle'), apiErrorMessage(error, this.t('userCalendar.requestFailed')), 'warning')
        console.log(error)
      }
    },
    async fetchHospitals() {
      try {
        const { data } = await axiosInstance.get('/hospitals/list')
        this.hospital = data
      } catch (error) {
        console.log(error)
      }
    },
    handleWeekendsToggle() {
      this.calendarOptions.weekends = !this.calendarOptions.weekends
    },
    handleDateSelect(selectInfo: DateSelectArg) {
      this.dialogTableVisible = true
      let calendarApi = selectInfo.view.calendar
      calendarApi.unselect()
      this.form.date1 = selectInfo.startStr
    },
    handleEventClick(clickInfo: EventClickArg) {
      this.outerVisible = true
      this.id = clickInfo.event.id
      this.currentAppointment = clickInfo.event
    },
    handleEvents(events: EventApi[]) {
      this.currentEvents = events
    },
    fetchData() {
      this.events = store.calendars
    },
    async cancelAppointment(id) {
      this.outerVisible = false
      await store.cancelAppointment(id)
      open2(this.t('userCalendar.toastTitle'), this.t('userCalendar.canceled'), 'success')
      store.fetchCalendarData()
    },
    removeAppointment(id) {
      this.outerVisible = false
      store.removeAppointment(id)
      store.fetchAppointments()
    }
  }
})
</script>
<template>
  <WebLayout>
    <SectionHeading :kicker="t('userCalendar.kicker')">
      <template #title>{{ t('userCalendar.heading') }}</template>
    </SectionHeading>
    <Card padding="p-4 sm:p-6" class="mt-6">
      <FullCalendar :options="fullCalendarOptions">
        <template v-slot:eventContent="arg">
          <div class="flex flex-col rounded-lg bg-accent px-2 py-1 text-white">
            <b class="text-xs">{{ arg.event.start.toLocaleTimeString() }}</b>
            <b class="text-xs">{{ arg.event.title }}</b>
          </div>
        </template>
      </FullCalendar>
    </Card>

    <!-- Update Appointment form -->
    <Dialog v-model:open="dialogEditVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('userCalendar.editTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.firstName') }}</Label>
              <Input v-model="formEdit.first_name" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.lastName') }}</Label>
              <Input v-model="formEdit.last_name" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>{{ t('userCalendar.appointmentTitle') }}</Label>
            <Input v-model="formEdit.title" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.selectHospitalLabel') }}</Label>
              <Select v-model="formEdit.hospital_id" @update:model-value="getDoctors">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('userCalendar.selectHospital')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in hospital" :key="item.id" :value="item.id">{{ item.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.selectDoctorLabel') }}</Label>
              <Select v-model="formEdit.doctor_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('userCalendar.selectDoctor')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in docData" :key="item.id" :value="item.id">
                    {{ item.first_name }} {{ item.last_name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.date') }}</Label>
              <DatePicker v-model="formEdit.date1" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.time') }}</Label>
              <Input v-model="formEdit.date2" type="time" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogEditVisible = false">{{ t('userCalendar.cancel') }}</UiButton>
          <UiButton variant="primary" @click="onUpdate">{{ t('userCalendar.update') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Appointment Creation Dialog -->
    <Dialog v-model:open="dialogTableVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('userCalendar.makeTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.firstName') }}</Label>
              <Input v-model="form.first_name" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.lastName') }}</Label>
              <Input v-model="form.last_name" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>{{ t('userCalendar.appointmentTitle') }}</Label>
            <Input v-model="form.title" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.selectHospitalLabel') }}</Label>
              <Select v-model="form.hospital_id" @update:model-value="getDoctors">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('userCalendar.pleaseSelectHospital')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in hospital" :key="item.id" :value="item.id">{{ item.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.selectDoctorLabel') }}</Label>
              <Select v-model="form.doctor_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('userCalendar.pleaseSelectDoctor')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in docData" :key="item.id" :value="item.id">
                    {{ item.first_name }} {{ item.last_name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('userCalendar.date') }}</Label>
              <DatePicker v-model="form.date1" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('userCalendar.time') }}</Label>
              <Input v-model="form.date2" type="time" />
            </div>
          </div>
          <SlotPicker v-model="form.date2" :doctor-id="form.doctor_id" :date="form.date1" />
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogTableVisible = false">{{ t('userCalendar.cancel') }}</UiButton>
          <UiButton variant="primary" @click="onSubmit">{{ t('userCalendar.create') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="outerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('userCalendar.detailsTitle') }}</DialogTitle>
        </DialogHeader>
        <dl class="space-y-2 text-sm text-slate-600">
          <p><b class="text-ink">{{ t('userCalendar.name') }}</b> {{ currentAppointment.extendedProps.user.first_name }}</p>
          <p><b class="text-ink">{{ t('userCalendar.doctor') }}</b> {{ currentAppointment.extendedProps.doctor.first_name }}</p>
          <p><b class="text-ink">{{ t('userCalendar.hospital') }}</b> {{ currentAppointment.extendedProps.hospital.name }}</p>
          <p><b class="text-ink">{{ t('userCalendar.phone') }}</b> {{ currentAppointment.extendedProps.user.phone_number }}</p>
          <p><b class="text-ink">{{ t('userCalendar.detailDate') }}</b> {{ currentAppointment.start?.toISOString().split('T')[0] }}</p>
          <p><b class="text-ink">{{ t('userCalendar.detailTime') }}</b> {{ currentAppointment.extendedProps.appointment_time }}</p>
          <p><b class="text-ink">{{ t('userCalendar.roomNo') }}</b> {{ currentAppointment.extendedProps.room?.name }}</p>
          <p><b class="text-ink">{{ t('userCalendar.status') }}</b> {{ translateStatus(t, currentAppointment.extendedProps.status) }}</p>
          <p><b class="text-ink">{{ t('userCalendar.gender') }}</b> {{ currentAppointment.extendedProps.user.gender }}</p>
        </dl>
        <DialogFooter>
          <div class="flex flex-wrap justify-center gap-3 w-full">
            <UiButton variant="subtle" @click="openEditDialog(currentAppointment)">{{ t('userCalendar.update') }}</UiButton>
            <UiButton variant="subtle" @click="cancelAppointment(currentAppointment.id)">{{ t('userCalendar.cancel') }}</UiButton>
            <UiButton variant="danger" @click="removeAppointment(currentAppointment.id)">{{ t('userCalendar.remove') }}</UiButton>
            <UiButton variant="subtle" @click="outerVisible = false">{{ t('userCalendar.close') }}</UiButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </WebLayout>
</template>
