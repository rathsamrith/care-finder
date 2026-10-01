<script setup lang="ts">
import axiosInstance from '@/plugins/axios'
import { onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { translateStatus } from '@/lib/appointment-status'
import { useAuthStore } from '@/stores/auth-store'
import { EyeIcon, MapPinCheckIcon, PencilIcon, PlusCircleIcon, Trash2Icon, XIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import SlotPicker from '@/components/appointment/slot-picker.vue'
import CheckInDialog from '@/components/appointment/check-in-dialog.vue'
import { apiErrorMessage } from '@/lib/api-error'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()
const appointment = hospitalAppointmentListStore()
let visible = ref(false)
let currentAppointment: any = {}
const doctorData = ref<any[]>([])
const doctorEditData = ref<any[]>([])
const hospital = ref<any[]>([])
const dialogTableVisible = ref(false)
const checkInId = ref<number | string | null>(null)
const checkInOpen = ref(false)
const openCheckIn = (row: any) => {
  checkInId.value = row.id
  checkInOpen.value = true
}
const canCheckIn = (row: any) => row.status === 'Confirmed' || row.status === 'Arrived'
const canCancel = (row: any) => row.status !== 'Arrived' && row.status !== 'Completed'
const dialogEditVisible = ref(false)
const store = useAuthStore()

const statusTone: Record<string, string> = {
  Canceled: 'accent',
  Confirmed: 'success',
  Pending: 'info',
  Missing: 'warning',
  Arrived: 'info',
  Completed: 'neutral',
  Rejected: 'danger'
}

const form = reactive({
  first_name: store.user.first_name,
  last_name: store.user.last_name,
  user_id: store.user.id,
  hospital_id: '',
  doctor_id: '',
  title: '',
  date1: '',
  date2: ''
})
let formEdit = reactive({
  id: '',
  first_name: '',
  last_name: '',
  user_id: store.user.id,
  hospital_id: '',
  doctor_id: '',
  title: '',
  date1: '',
  date2: ''
})

async function fetchHospitals() {
  try {
    const { data } = await axiosInstance.get('/hospitals/list')
    data.forEach((hosp: any) => {
      hospital.value.push(hosp)
    })
  } catch (error) {
    console.log(error)
  }
}

const openEditDialog = (row: any) => {
  console.log(row)
  dialogEditVisible.value = true
  formEdit.id = row.id
  formEdit.first_name = row.user.first_name
  formEdit.last_name = row.user.last_name
  formEdit.hospital_id = row.doctor.hospital_id
  formEdit.doctor_id = row.doctor.id
  formEdit.title = row.title
  formEdit.date1 = row.appointment_date
  formEdit.date2 = row.appointment_time
  formEdit.user_id = row.user.id
}
const open2 = (_title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
  toast[type](message)
}

async function fetchDoctors(hospital_id: any, docData: { value: any[] }) {
  try {
    const { data } = await axiosInstance.get(`/hospitals/show/${hospital_id}`)
    data.doctors.forEach((doctor: any) => {
      docData.value.push(doctor)
      console.log(doctor)
    })
  } catch (error) {
    console.log(error)
  }
}

const onSubmit = async () => {
  dialogTableVisible.value = false
  const payload = {
    appointmentDate: form.date1,
    appointmentTime: form.date2,
    hospitalId: form.hospital_id,
    title: form.title,
    doctorId: form.doctor_id
  }
  try {
    const { data } = await axiosInstance.post('/appointments/create', payload)
    await appointment.fetchAppointments()
    await appointment.fetchCalendarData()
    console.log(data)
    open2(t('appointment.table.requestTitle'), t('appointment.table.requested'), 'success')
  } catch (error) {
    open2(t('appointment.table.requestTitle'), apiErrorMessage(error, t('appointment.table.requestFailed')), 'warning')
    console.log(error)
  }
}

const deleteAppointment = async (row: any) => {
  const id = row.id
  try {
    await axiosInstance.delete(`/appointments/delete/${id}`)
    open2(t('appointment.table.toastTitle'), t('appointment.table.deleted'), 'success')
  } catch (error) {
    open2(t('appointment.table.toastTitle'), t('appointment.table.deleteFailed'), 'warning')
    console.log(error)
  }
  appointment.fetchAppointments()
}

const onUpdate = async () => {
  dialogEditVisible.value = false
  const payload = {
    appointmentDate: formEdit.date1,
    appointmentTime: formEdit.date2,
    title: formEdit.title
  }
  try {
    const { data } = await axiosInstance.put(`/appointments/update/${formEdit.id}`, payload)
    console.log(data)
    open2(t('appointment.table.toastTitle'), t('appointment.table.updated'), 'success')
  } catch (error) {
    open2(t('appointment.table.toastTitle'), t('appointment.table.updateFailed'), 'warning')
    console.log(error)
  }
}

async function cancelAppointment(row: any) {
  await appointment.cancelAppointment(row.id)
  open2(t('appointment.table.toastTitle'), t('appointment.table.canceled'), 'success')
}

function openDialog(row: any) {
  visible.value = true
  currentAppointment = row
}

function closeDialog() {
  visible.value = false
}

onMounted(() => {
  fetchHospitals()
  appointment.fetchAppointments()
})
watch(
  () => form.hospital_id,
  () => {
    fetchDoctors(form.hospital_id, doctorData)
  }
)
watch(
  () => formEdit.hospital_id,
  () => {
    fetchDoctors(formEdit.hospital_id, doctorEditData)
  }
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <SectionHeading :kicker="t('appointment.table.kicker')">
        <template #title>{{ t('appointment.table.heading') }}</template>
      </SectionHeading>
      <UiButton variant="primary" @click="dialogTableVisible = true">
        <PlusCircleIcon class="size-4" />
        {{ t('appointment.table.make') }}
      </UiButton>
    </div>

    <!-- Edit Appointment Form -->
    <Dialog v-model:open="dialogEditVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('appointment.table.editTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.firstName') }}</Label>
              <Input v-model="formEdit.first_name" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.lastName') }}</Label>
              <Input v-model="formEdit.last_name" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>{{ t('appointment.table.appointmentTitle') }}</Label>
            <Input v-model="formEdit.title" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.selectHospitalLabel') }}</Label>
              <Select v-model="formEdit.hospital_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('appointment.table.selectHospital')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in hospital" :key="item.id" :value="item.id">{{ item.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.selectDoctorLabel') }}</Label>
              <Select v-model="formEdit.doctor_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('appointment.table.selectDoctor')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in doctorEditData" :key="item.id" :value="item.id">
                    {{ item.first_name }} {{ item.last_name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.date') }}</Label>
              <DatePicker v-model="formEdit.date1" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.time') }}</Label>
              <Input v-model="formEdit.date2" type="time" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogEditVisible = false">{{ t('appointment.table.cancel') }}</UiButton>
          <UiButton variant="primary" @click="onUpdate">{{ t('appointment.table.update') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Make Appointment Form -->
    <Dialog v-model:open="dialogTableVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('appointment.table.makeTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.firstName') }}</Label>
              <Input v-model="form.first_name" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.lastName') }}</Label>
              <Input v-model="form.last_name" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>{{ t('appointment.table.appointmentTitle') }}</Label>
            <Input v-model="form.title" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.selectHospitalLabel') }}</Label>
              <Select v-model="form.hospital_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('appointment.table.pleaseSelectHospital')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in hospital" :key="item.id" :value="item.id">{{ item.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.selectDoctorLabel') }}</Label>
              <Select v-model="form.doctor_id">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('appointment.table.pleaseSelectDoctor')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="item in doctorData" :key="item.id" :value="item.id">
                    {{ item.first_name }} {{ item.last_name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ t('appointment.table.date') }}</Label>
              <DatePicker v-model="form.date1" />
            </div>
            <div class="space-y-2">
              <Label>{{ t('appointment.table.time') }}</Label>
              <Input v-model="form.date2" type="time" />
            </div>
          </div>
          <SlotPicker v-model="form.date2" :doctor-id="form.doctor_id" :date="form.date1" />
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogTableVisible = false">{{ t('appointment.table.cancel') }}</UiButton>
          <UiButton variant="primary" @click="onSubmit">{{ t('appointment.table.create') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Card padding="p-2" class="mt-6">
      <div class="max-h-[450px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[180px]">{{ t('appointment.table.colName') }}</TableHead>
              <TableHead class="w-[180px]">{{ t('appointment.table.colHospital') }}</TableHead>
              <TableHead>{{ t('appointment.table.colDate') }}</TableHead>
              <TableHead>{{ t('appointment.table.colStatus') }}</TableHead>
              <TableHead>{{ t('appointment.table.colAction') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in appointment.appointments" :key="row.id">
              <TableCell>{{ row.user?.name }}</TableCell>
              <TableCell>{{ row.hospital }}</TableCell>
              <TableCell>{{ row.appointment_date }}</TableCell>
              <TableCell>
                <Badge :tone="(statusTone[row.status] || 'neutral') as any">{{ translateStatus(t, row.status) }}</Badge>
              </TableCell>
              <TableCell>
                <div class="flex gap-2">
                  <UiButton variant="icon" @click="openEditDialog(row)">
                    <PencilIcon class="size-4" />
                  </UiButton>
                  <UiButton variant="icon" @click="openDialog(row)">
                    <EyeIcon class="size-4" />
                  </UiButton>
                  <UiButton v-if="canCheckIn(row)" variant="icon" :title="t('checkin.button')" :aria-label="t('checkin.button')" @click="openCheckIn(row)">
                    <MapPinCheckIcon class="size-4" />
                  </UiButton>
                  <UiButton v-if="canCancel(row)" variant="icon" @click="cancelAppointment(row)">
                    <XIcon class="size-4" />
                  </UiButton>
                  <UiButton variant="icon" @click="deleteAppointment(row)">
                    <Trash2Icon class="size-4" />
                  </UiButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <Dialog v-model:open="visible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('appointment.table.detailsTitle') }}</DialogTitle>
        </DialogHeader>
        <dl class="space-y-2 text-sm text-slate-600">
          <p><b class="text-ink">{{ t('appointment.table.name') }}</b> {{ currentAppointment.user.name }}</p>
          <p><b class="text-ink">{{ t('appointment.table.doctor') }}</b> {{ currentAppointment.doctor.name }}</p>
          <p><b class="text-ink">{{ t('appointment.table.hospital') }}</b> {{ currentAppointment.hospital }}</p>
          <p><b class="text-ink">{{ t('appointment.table.phone') }}</b> {{ currentAppointment.user.phone_number }}</p>
          <p><b class="text-ink">{{ t('appointment.table.detailDate') }}</b> {{ currentAppointment.appointment_date }}</p>
          <p><b class="text-ink">{{ t('appointment.table.detailTime') }}</b> {{ currentAppointment.appointment_time }}</p>
          <p><b class="text-ink">{{ t('appointment.table.roomNo') }}</b> {{ currentAppointment.room?.name }}</p>
          <p><b class="text-ink">{{ t('appointment.table.status') }}</b> {{ translateStatus(t, currentAppointment.status) }}</p>
          <p><b class="text-ink">{{ t('appointment.table.gender') }}</b> {{ currentAppointment.user.gender }}</p>
        </dl>
        <DialogFooter>
          <div class="flex justify-center w-full">
            <UiButton variant="danger" @click="closeDialog">{{ t('appointment.table.close') }}</UiButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CheckInDialog v-model:open="checkInOpen" :appointment-id="checkInId" @checked-in="appointment.fetchAppointments()" />
  </div>
</template>
