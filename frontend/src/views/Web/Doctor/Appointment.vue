<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted } from 'vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { doctorNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import axiosInstance from '@/plugins/axios'
import { toast } from 'vue-sonner'
import AppointmentStatusBadge from '@/components/appointment/appointment-status-badge.vue'
import { formatAppointmentDate as formatDate } from '@/lib/format'

const { t } = useI18n()
const store = hospitalAppointmentListStore()
const hospital = hospitalDetailStore()

const centerDialogVisible = ref(false)
const innerVisible = ref(false)
const selectedAppointment = ref<any>(null)
const confirmData = ref({
  appointment_id: ''
})
const roomId = ref('')

const rooms = computed(() => (hospital.hospitalDetail as any)?.rooms ?? [])
const appointments = computed(() => store.appointments as any[])

const alertAppointmentPopup = (id: any, doctorHospitalId: any) => {
  confirmData.value.appointment_id = id
  hospital.fetchHospitalDetail(doctorHospitalId)
  centerDialogVisible.value = false
  innerVisible.value = true
}

const confirmAppointment = async () => {
  innerVisible.value = false
  try {
    await axiosInstance.put(`/appointments/update-status/${confirmData.value.appointment_id}`, {
      status: 'Confirmed',
      roomId: Number(roomId.value)
    })
    toast.success(t('doctorDash.appointments.confirmed'))
  } catch (error) {
    console.error(error)
    toast.error(t('doctorDash.appointments.confirmFailed'))
  }
  store.fetchAppointments()
}

const showDetails = (row: any) => {
  selectedAppointment.value = row
  centerDialogVisible.value = true
}

onMounted(() => {
  store.fetchAppointments()
})
</script>

<template>
  <DashboardLayout :nav-items="doctorNavItems" :portal-label="t('doctorDash.portal')">
    <Dialog v-model:open="centerDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('doctorDash.appointments.detailTitle') }}</DialogTitle>
        </DialogHeader>
        <dl v-if="selectedAppointment" class="space-y-2 text-sm text-muted-foreground">
          <p><b class="text-foreground">{{ t('doctorDash.appointments.patientLabel') }}</b> {{ selectedAppointment.user?.first_name }} {{ selectedAppointment.user?.last_name }}</p>
          <p v-if="selectedAppointment.user?.phone_number"><b class="text-foreground">{{ t('doctorDash.appointments.phoneLabel') }}</b> {{ selectedAppointment.user?.phone_number }}</p>
          <p><b class="text-foreground">{{ t('doctorDash.appointments.dateLabel') }}</b> {{ formatDate(selectedAppointment.appointment_date) }}</p>
          <p class="flex items-center gap-2"><b class="text-foreground">{{ t('doctorDash.appointments.statusLabel') }}</b> <AppointmentStatusBadge :status="selectedAppointment.status" /></p>
          <p><b class="text-foreground">{{ t('doctorDash.appointments.responseLabel') }}</b> {{ selectedAppointment.doctor_status }}</p>
        </dl>
        <DialogFooter>
          <Button variant="outline" @click="centerDialogVisible = false">{{ t('doctorDash.appointments.cancel') }}</Button>
          <Button v-if="selectedAppointment?.status !== 'Confirmed'" @click="alertAppointmentPopup(selectedAppointment?.id, selectedAppointment?.doctor?.hospital_id)">{{ t('doctorDash.appointments.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="innerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('doctorDash.appointments.confirmTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">{{ t('doctorDash.appointments.assignRoom') }}</label>
          <Select v-model="roomId">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('doctorDash.appointments.selectRoom')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="room in rooms" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="innerVisible = false">{{ t('doctorDash.appointments.cancel') }}</Button>
          <Button @click="confirmAppointment">{{ t('doctorDash.appointments.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <SectionHeading :kicker="t('doctorDash.appointments.kicker')">
      <template #title>{{ t('nav.appointments') }}</template>
    </SectionHeading>

    <Card class="mt-6">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('doctorDash.appointments.id') }}</TableHead>
              <TableHead>{{ t('doctorDash.appointments.patient') }}</TableHead>
              <TableHead>{{ t('doctorDash.appointments.date') }}</TableHead>
              <TableHead>{{ t('doctorDash.appointments.status') }}</TableHead>
              <TableHead>{{ t('doctorDash.appointments.myResponse') }}</TableHead>
              <TableHead class="text-right">{{ t('doctorDash.appointments.action') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in appointments" :key="row.id">
              <TableCell>{{ row.id }}</TableCell>
              <TableCell>{{ row.user?.first_name }}</TableCell>
              <TableCell>{{ formatDate(row.appointment_date) }}</TableCell>
              <TableCell>
                <AppointmentStatusBadge :status="row.status" />
              </TableCell>
              <TableCell>{{ row.doctor_status }}</TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" @click="showDetails(row)">{{ t('doctorDash.appointments.detail') }}</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!appointments.length" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('doctorDash.appointments.empty') }}
        </p>
      </CardContent>
    </Card>
  </DashboardLayout>
</template>
