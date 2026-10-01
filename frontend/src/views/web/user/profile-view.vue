<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { adminNavItems, doctorNavItems, hospitalNavItems } from '@/components/layouts/dashboard-nav'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { computed, reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { translateStatus } from '@/lib/appointment-status'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import { useUserAddressStore } from '@/stores/user-address-store'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import axiosInstance from '@/plugins/axios'

const { t } = useI18n()
const addressStore = useUserAddressStore()
const appointmentStore = hospitalAppointmentListStore()

const dialogVisible = ref(false)
let previewImage = ref('')
const store = useAuthStore()
const selectFile = () => {
  dialogVisible.value = true
}
const handleDialogOpenChange = (open: boolean) => {
  if (!open && !window.confirm(t('profile.confirmClose'))) return
  dialogVisible.value = open
}
const selectUploadFie = () => {
  document.getElementById('inputFile')?.click()
}
let file: any
const getData = (e: any) => {
  file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}
const uploadFile = async () => {
  const formData = { image: file }
  try {
    const { data } = await axiosInstance.post('/profileUpload', formData)
    console.log(data)
  } catch (error) {
    console.log(error)
  }
}
const activeName = ref('first')

// This page serves every role. Patients get personal address + visit history;
// hospital/doctor/admin accounts get an account card inside their own portal
// layout (their address and "visits" live on the hospital page / dashboards,
// and appointmentStore.appointments for them is the hospital's patients, not
// their own visits).
type Role = 'user' | 'hospital' | 'doctor' | 'admin'
const role = computed<Role>(() => {
  const roles: string[] = store.roles ?? []
  return (['admin', 'hospital', 'doctor'] as const).find((r) => roles.includes(r)) ?? 'user'
})
const isPatient = computed(() => role.value === 'user')

const PORTALS = {
  hospital: { items: hospitalNavItems, label: 'hospitalDash.portal', to: '/myHospital' },
  doctor: { items: doctorNavItems, label: 'doctorDash.portal', to: '/doctor/dashboard' },
  admin: { items: adminNavItems, label: 'misc.admin.portal', to: '/admin/dashboard' }
} as const
const portal = computed(() => (isPatient.value ? null : PORTALS[role.value as keyof typeof PORTALS]))
const layoutProps = computed(() =>
  portal.value ? { navItems: portal.value.items, portalLabel: t(portal.value.label) } : {}
)

const hasProfileImage = computed(() => Boolean(store.user?.profile) && store.user.profile !== 'No profile')

const generalInfo = [
  { label: 'profile.firstName', value: () => store.user.first_name },
  { label: 'profile.lastName', value: () => store.user.last_name },
  { label: 'profile.gender', value: () => store.user.gender },
  { label: 'profile.dob', value: () => store.user.date_of_birth },
  { label: 'profile.email', value: () => store.user.email },
  { label: 'profile.phone', value: () => store.user.phone }
]
const generalValue = (item: { value: () => unknown }) => (item.value() as string) || t('profile.notProvided')
const primaryAddress = computed(() => addressStore.addresses[0])
const addressInfo = computed(() => [
  { label: t('profile.village'), value: primaryAddress.value?.village || t('profile.notProvided') },
  { label: t('profile.commune'), value: primaryAddress.value?.commune || t('profile.notProvided') },
  { label: t('profile.district'), value: primaryAddress.value?.district || t('profile.notProvided') },
  { label: t('profile.province'), value: primaryAddress.value?.province || t('profile.notProvided') }
])

const addressDialogVisible = ref(false)
const addressForm = reactive({
  village: '',
  commune: '',
  district: '',
  province: ''
})

const openAddressDialog = () => {
  addressForm.village = primaryAddress.value?.village ?? ''
  addressForm.commune = primaryAddress.value?.commune ?? ''
  addressForm.district = primaryAddress.value?.district ?? ''
  addressForm.province = primaryAddress.value?.province ?? ''
  addressDialogVisible.value = true
}

const saveAddress = async () => {
  if (primaryAddress.value) {
    await addressStore.updateAddress(primaryAddress.value.id, addressForm)
  } else {
    await addressStore.createAddress(addressForm)
  }
  addressDialogVisible.value = false
}

const visitHistory = computed(() =>
  appointmentStore.appointments.filter((appointment: any) => appointment.status === 'Confirmed')
)

onMounted(() => {
  if (!isPatient.value) return
  addressStore.fetchAddresses()
  appointmentStore.fetchAppointments()
})
</script>
<template>
  <component :is="portal ? DashboardLayout : WebLayout" v-bind="layoutProps">
    <Dialog :open="dialogVisible" @update:open="handleDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('profile.uploadTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col items-center">
          <Avatar class="size-[140px] cursor-pointer" @click="selectUploadFie">
            <AvatarImage :src="previewImage || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
          </Avatar>
          <input type="file" @change="getData" id="inputFile" hidden />
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogVisible = false">{{ t('profile.cancel') }}</UiButton>
          <UiButton variant="primary" @click="uploadFile">{{ t('profile.confirm') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Card padding="p-6 sm:p-8" class="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      <Avatar class="size-[120px] cursor-pointer" @click="selectFile">
        <AvatarImage v-if="hasProfileImage" :src="store.user.profile" />
        <AvatarFallback class="bg-accent text-3xl font-semibold text-white">
          {{ store.user.first_name?.[0] }}{{ store.user.last_name?.[0] }}
        </AvatarFallback>
      </Avatar>
      <div class="mt-4 sm:mt-0">
        <h1 class="text-2xl font-semibold tracking-tight text-ink">
          {{ store.user.first_name }} {{ store.user.last_name }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">{{ store.user.email }}</p>
        <Badge v-if="!isPatient" tone="accent" class="mt-3">{{ t(`profile.roles.${role}`) }}</Badge>
      </div>
    </Card>

    <section class="mt-6">
      <Card padding="p-4 sm:p-6">
        <Tabs v-model="activeName">
          <TabsList v-if="isPatient">
            <TabsTrigger value="first">{{ t('profile.tabPersonal') }}</TabsTrigger>
            <TabsTrigger value="second">{{ t('profile.tabHistory') }}</TabsTrigger>
          </TabsList>
          <TabsContent value="first">
            <div class="space-y-6 pt-2">
              <div>
                <h3 class="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {{ isPatient ? t('profile.generalInfo') : t('profile.accountInfo') }}
                </h3>
                <div class="mt-3 grid gap-4 sm:grid-cols-3">
                  <div v-for="item in generalInfo" :key="item.label">
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t(item.label) }}</p>
                    <p class="mt-1 text-sm font-medium text-ink">{{ generalValue(item) }}</p>
                  </div>
                </div>
              </div>
              <div v-if="isPatient">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">{{ t('profile.address') }}</h3>
                  <UiButton variant="subtle" @click="openAddressDialog">{{ t('profile.edit') }}</UiButton>
                </div>
                <div class="mt-3 grid gap-4 sm:grid-cols-3">
                  <div v-for="item in addressInfo" :key="item.label">
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ item.label }}</p>
                    <p class="mt-1 text-sm font-medium text-ink">{{ item.value }}</p>
                  </div>
                </div>
              </div>
              <Card v-if="portal" variant="muted" padding="p-5" class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 class="text-sm font-semibold text-ink">{{ t('profile.workspace.title') }}</h4>
                  <p class="mt-1 text-sm text-slate-600">{{ t(`profile.workspace.body.${role}`) }}</p>
                </div>
                <RouterLink :to="portal.to">
                  <UiButton variant="primary">{{ t(`profile.workspace.cta.${role}`) }}</UiButton>
                </RouterLink>
              </Card>
            </div>
          </TabsContent>
          <TabsContent v-if="isPatient" value="second">
            <div class="space-y-4 pt-2">
              <Card v-for="visit in visitHistory" :key="visit.id" variant="muted" padding="p-5">
                <h4 class="text-sm font-semibold text-ink">{{ t('profile.visitTo', { hospital: visit.hospital }) }}</h4>
                <div class="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('profile.doctor') }}</p>
                    <p class="mt-1 text-sm text-ink">
                      {{ visit.doctor ? `${visit.doctor.first_name} ${visit.doctor.last_name}` : t('profile.notAssigned') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('profile.date') }}</p>
                    <p class="mt-1 text-sm text-ink">{{ visit.appointment_date?.slice(0, 10) }}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('profile.room') }}</p>
                    <p class="mt-1 text-sm text-ink">{{ visit.room?.name || t('profile.notAssigned') }}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('profile.status') }}</p>
                    <Badge tone="accent" class="mt-1">{{ translateStatus(t, visit.status) }}</Badge>
                  </div>
                  <div class="sm:col-span-2">
                    <p class="text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('profile.title') }}</p>
                    <p class="mt-1 text-sm text-ink">{{ visit.title }}</p>
                  </div>
                </div>
              </Card>
              <p v-if="!visitHistory.length" class="text-sm text-slate-500">{{ t('profile.noVisits') }}</p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </section>

    <Dialog v-model:open="addressDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('profile.editAddress') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('profile.village') }}</Label>
            <Input v-model="addressForm.village" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('profile.commune') }}</Label>
            <Input v-model="addressForm.commune" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('profile.district') }}</Label>
            <Input v-model="addressForm.district" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('profile.province') }}</Label>
            <Input v-model="addressForm.province" />
          </div>
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="addressDialogVisible = false">{{ t('profile.cancel') }}</UiButton>
          <UiButton variant="primary" @click="saveAddress">{{ t('profile.save') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </component>
</template>
