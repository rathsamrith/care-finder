<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="userStore.hospital != 'No hospital'">
    <SectionHeading :kicker="t('hospitalDash.appointments.kicker')">
      <template #title>{{ t('hospitalDash.appointments.title') }}</template>
    </SectionHeading>
    <Card class="mt-6">
      <CardContent>
        <div class="mb-4 flex flex-wrap gap-3">
          <Select v-model="statusFilter">
            <SelectTrigger class="w-48"><SelectValue :placeholder="t('hospitalDash.appointments.filterStatus')" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('hospitalDash.appointments.allStatuses') }}</SelectItem>
              <SelectItem v-for="status in statusOptions" :key="status" :value="status">{{ statusText(status) }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="hospitalStatusFilter">
            <SelectTrigger class="w-56"><SelectValue :placeholder="t('hospitalDash.appointments.filterHospital')" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('hospitalDash.appointments.allHospital') }}</SelectItem>
              <SelectItem v-for="status in statusOptions" :key="status" :value="status">{{ statusText(status) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('hospitalDash.appointments.profile') }}</TableHead>
              <TableHead>{{ t('hospitalDash.appointments.name') }}</TableHead>
              <TableHead>{{ t('hospitalDash.appointments.date') }}</TableHead>
              <TableHead>{{ t('hospitalDash.appointments.hospital') }}</TableHead>
              <TableHead>{{ t('hospitalDash.appointments.status') }}</TableHead>
              <TableHead>{{ t('hospitalDash.appointments.hospitalConfirmation') }}</TableHead>
              <TableHead class="text-right">{{ t('hospitalDash.appointments.action') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in filteredAppointments" :key="row.id">
              <TableCell>
                <Avatar>
                  <AvatarImage :src="row.user.profile" />
                  <AvatarFallback>{{ initials(row) }}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <strong>{{ row.user.first_name }} {{ row.user.last_name }}</strong>
              </TableCell>
              <TableCell>{{ row.appointment_date }}</TableCell>
              <TableCell>{{ row.hospital }}</TableCell>
              <TableCell>
                <AppointmentStatusBadge :status="row.status" />
              </TableCell>
              <TableCell>
                <AppointmentStatusBadge :status="row.hospital_status" />
              </TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" @click="showDetails(row)">{{ t('hospitalDash.appointments.details') }}</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!filteredAppointments.length" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('hospitalDash.appointments.empty') }}
        </p>
      </CardContent>
    </Card>

    <Dialog v-model:open="outerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.appointments.detailsTitle') }}</DialogTitle>
        </DialogHeader>
        <dl class="space-y-2 text-sm text-muted-foreground">
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.nameLabel') }}</b> {{ currentAppointment.user.first_name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.doctorLabel') }}</b> {{ currentAppointment.doctor.first_name }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.hospitalLabel') }}</b> {{ currentAppointment.hospital }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.phoneLabel') }}</b> {{ currentAppointment.user.phone_number }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.dateLabel') }}</b> {{ currentAppointment.appointment_date }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.timeLabel') }}</b> {{ currentAppointment.appointment_time }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.statusLabel') }}</b> {{ currentAppointment.status }}</p>
          <p><b class="text-foreground">{{ t('hospitalDash.appointments.genderLabel') }}</b> {{ currentAppointment.user.gender }}</p>
        </dl>
        <DialogFooter>
          <Button variant="outline" @click="outerVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button v-if="currentAppointment.status !== 'Confirmed'" @click="ConfirmAppointment">{{ t('hospitalDash.appointments.confirmAppointment') }}</Button>
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
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computed, onMounted, ref, watch } from 'vue'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth-store'
import { statusTone } from '@/lib/appointment-status'
import AppointmentStatusBadge from '@/components/appointment/appointment-status-badge.vue'

const { t } = useI18n()
const userStore = useAuthStore()
const store = hospitalAppointmentListStore()
const appointments = computed(() => store.appointments as any[])
const outerVisible = ref(false)
const innerVisible = ref(false)
let currentAppointment: any = {}
let id: any = ''

const statusOptions = Object.keys(statusTone)
const statusText = (status: string) => t(`hospitalDash.status.${status}`)

const statusFilter = ref('all')
const hospitalStatusFilter = ref('all')
const filteredAppointments = computed(() =>
  appointments.value.filter(
    (row) =>
      (statusFilter.value === 'all' || row.status === statusFilter.value) &&
      (hospitalStatusFilter.value === 'all' || row.hospital_status === hospitalStatusFilter.value)
  )
)

const initials = (row: any) => `${row.user?.first_name?.[0] ?? ''}${row.user?.last_name?.[0] ?? ''}`.toUpperCase()

const ConfirmAppointment = () => {
  outerVisible.value = false
  innerVisible.value = true
}
const submitConfirmation = () => {
  innerVisible.value = false
  store.confirmAppointment(id)
  store.fetchAppointments()
  console.log('submit', id)
}
watch(
  () => store.message,
  (message) => {
    if (message && Object.keys(message).length > 0) {
      toast.success(t('hospitalDash.appointments.statusUpdated'))
    }
  }
)
onMounted(() => {
  if (userStore.hospital != 'No hospital') {
    store.fetchAppointments()
  }
})

const showDetails = (row: any) => {
  outerVisible.value = true
  currentAppointment = row
  id = row.id
}
</script>
