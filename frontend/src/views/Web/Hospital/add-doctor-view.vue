<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ConfirmDialog from '@/components/ui/confirm-dialog.vue'
import EmptyState from '@/components/ui/empty-state.vue'
import { CalendarClockIcon, MailIcon, PencilIcon, PhoneIcon, StethoscopeIcon, Trash2Icon } from '@lucide/vue'
import ScheduleEditor from '@/components/doctor/schedule-editor.vue'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/api-error'
import { useDoctorStore } from '@/stores/doctor-store'
const { t } = useI18n()
const store = useAuthStore()
const doctorStore = useDoctorStore()
const dialogTableVisible = ref(false)
const editDialogVisible = ref(false)
const scheduleDialogVisible = ref(false)
const scheduleDoctorId = ref<number | string | null>(null)
const scheduleDoctorName = ref('')
const userStore = useAuthStore()
const formData = ref({
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone: '',
  response: ''
})
const isEditing = ref(false)

async function fetchDoctors() {
  await doctorStore.fetchDoctors()
}

const handleSubmit = async () => {
  // Creating an account: check what the server would reject, so the message is
  // in the user's language and the dialog stays open with their input intact.
  if (!isEditing.value) {
    const f = formData.value
    if (!f.first_name.trim() || !f.last_name.trim() || !f.email.trim()) return toast.error(t('hospitalDash.doctors.requiredFields'))
    if (f.password.length < 8) return toast.error(t('auth.reset.tooShort'))
  }
  try {
    if (isEditing.value) {
      await doctorStore.updateDoctor(formData.value.id, {
        firstName: formData.value.first_name,
        lastName: formData.value.last_name,
        phone: formData.value.phone,
        response: formData.value.response
      })
    } else {
      await doctorStore.createDoctor({
        firstName: formData.value.first_name,
        lastName: formData.value.last_name,
        email: formData.value.email,
        password: formData.value.password,
        phone: formData.value.phone,
        response: formData.value.response,
        hospitalId: userStore.hospital.id
      })
    }
    await fetchDoctors()
    dialogTableVisible.value = false
    editDialogVisible.value = false
    toast.success(t(isEditing.value ? 'hospitalDash.doctors.updated' : 'hospitalDash.doctors.created'))
  } catch (e) {
    toast.error(apiErrorMessage(e, t('hospitalDash.doctors.saveFailed')))
  }
}
const openAddDoctor = () => {
  formData.value = {
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    response: ''
  }
  isEditing.value = false
  dialogTableVisible.value = true
}

const openSchedule = (doctor: any) => {
  scheduleDoctorId.value = doctor.id
  scheduleDoctorName.value = `${doctor.user?.firstName ?? ''} ${doctor.user?.lastName ?? ''}`.trim()
  scheduleDialogVisible.value = true
}

const editDoctor = (doctor: any) => {
  formData.value = {
    id: doctor.id,
    first_name: doctor.user?.firstName ?? '',
    last_name: doctor.user?.lastName ?? '',
    email: doctor.user?.email ?? '',
    password: '',
    phone: doctor.user?.phone ?? '',
    response: doctor.response ?? ''
  }
  isEditing.value = true
  editDialogVisible.value = true
}

const toRemove = ref<any>(null)
const removing = ref(false)
const initials = (d: any) => `${d.user?.firstName?.charAt(0) ?? ''}${d.user?.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?'
const deleteDoctor = async () => {
  if (!toRemove.value) return
  removing.value = true
  try {
    await doctorStore.deleteDoctor(toRemove.value.id)
    await fetchDoctors()
  } finally {
    removing.value = false
    toRemove.value = null
  }
}

onMounted(() => {
  if (userStore.hospital != 'No hospital') {
    fetchDoctors()
  }
})
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="store.hospital != 'No hospital'">
    <div class="flex items-center justify-between">
      <SectionHeading :kicker="t('hospitalDash.doctors.kicker')">
        <template #title>{{ t('hospitalDash.doctors.title') }}</template>
      </SectionHeading>
      <Button @click="openAddDoctor">{{ t('hospitalDash.doctors.add') }}</Button>
    </div>

    <!-- Add doctor dialog -->
    <Dialog v-model:open="dialogTableVisible">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.doctors.addNew') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.doctors.firstName') }}</Label>
              <Input v-model="formData.first_name" />
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.doctors.lastName') }}</Label>
              <Input v-model="formData.last_name" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.email') }}</Label>
            <Input v-model="formData.email" />
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.password') }}</Label>
            <Input v-model="formData.password" type="password" />
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.phone') }}</Label>
            <Input v-model="formData.phone" />
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.bio') }}</Label>
            <Textarea v-model="formData.response" :placeholder="t('hospitalDash.doctors.bioPlaceholder')" :rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogTableVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="handleSubmit">{{ t('hospitalDash.doctors.addNew') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit doctor dialog -->
    <Dialog v-model:open="editDialogVisible">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.doctors.updateInfo') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.doctors.firstName') }}</Label>
              <Input v-model="formData.first_name" />
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.doctors.lastName') }}</Label>
              <Input v-model="formData.last_name" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.phone') }}</Label>
            <Input v-model="formData.phone" />
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.doctors.bio') }}</Label>
            <Textarea v-model="formData.response" :placeholder="t('hospitalDash.doctors.bioPlaceholder')" :rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editDialogVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="handleSubmit">{{ t('hospitalDash.doctors.update') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Working hours dialog -->
    <Dialog v-model:open="scheduleDialogVisible">
      <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ t('schedule.dialogTitle', { name: scheduleDoctorName }) }}</DialogTitle>
        </DialogHeader>
        <ScheduleEditor v-if="scheduleDoctorId" :doctor-id="scheduleDoctorId" @saved="scheduleDialogVisible = false" />
      </DialogContent>
    </Dialog>

    <EmptyState
      v-if="!doctorStore.doctors.length"
      class="mt-6"
      :icon="StethoscopeIcon"
      :title="t('hospitalDash.doctors.emptyTitle')"
      :message="t('hospitalDash.doctors.emptyHelp')"
    >
      <template #action><Button @click="openAddDoctor">{{ t('hospitalDash.doctors.add') }}</Button></template>
    </EmptyState>
    <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <Card v-for="doctor in doctorStore.doctors" :key="doctor.id" class="gap-0 py-0" data-testid="doctor-card">
        <div class="flex items-start gap-4 p-5">
          <Avatar class="size-14 shrink-0">
            <AvatarFallback class="bg-accent-tint text-lg font-semibold text-accent-deep">{{ initials(doctor) }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-semibold text-ink">{{ doctor.user?.firstName }} {{ doctor.user?.lastName }}</p>
            <p class="mt-1 flex items-center gap-2 truncate text-sm text-slate-600">
              <MailIcon class="size-3.5 shrink-0 text-slate-400" /><span class="truncate">{{ doctor.user?.email }}</span>
            </p>
            <p v-if="doctor.user?.phone" class="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
              <PhoneIcon class="size-3.5 shrink-0 text-slate-400" />{{ doctor.user.phone }}
            </p>
          </div>
        </div>
        <p v-if="doctor.response" class="line-clamp-2 px-5 pb-4 text-sm text-slate-600">{{ doctor.response }}</p>
        <div class="mt-auto flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Button size="sm" @click="openSchedule(doctor)"><CalendarClockIcon />{{ t('schedule.button') }}</Button>
          <Button variant="outline" size="sm" @click="editDoctor(doctor)"><PencilIcon />{{ t('hospitalDash.doctors.update') }}</Button>
          <Button variant="ghost" size="sm" class="ml-auto text-destructive hover:text-destructive" @click="toRemove = doctor">
            <Trash2Icon />{{ t('hospitalDash.doctors.remove') }}
          </Button>
        </div>
      </Card>
    </div>

    <ConfirmDialog
      :open="!!toRemove"
      :title="t('hospitalDash.doctors.confirmTitle')"
      :message="toRemove ? t('hospitalDash.doctors.confirmRemove', { name: `${toRemove.user?.firstName ?? ''} ${toRemove.user?.lastName ?? ''}`.trim() }) : ''"
      :confirm-label="t('hospitalDash.doctors.remove')"
      :cancel-label="t('hospitalDash.cancel')"
      :busy="removing"
      @update:open="(v: boolean) => !v && (toRemove = null)"
      @confirm="deleteDoctor"
    />
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
