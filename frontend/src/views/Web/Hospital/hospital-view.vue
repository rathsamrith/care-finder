<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadIcon } from '@lucide/vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import UiButton from '@/components/ui/button.vue'
import CoverUploader from '@/components/hospital/cover-uploader.vue'
import ProfileOverview from '@/components/hospital/profile-overview.vue'
import ServiceTab from '@/components/hospital/service-tab.vue'
import CardDepartment from '@/components/hospital/card-department.vue'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/api-error'
import { isBlank, toUpdatePayload, type CompletenessKey } from '@/lib/hospital-profile'
import axiosInstance from '@/plugins/axios'
import { useDoctorStore } from '@/stores/doctor-store'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import { useAuthStore } from '@/stores/auth-store'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import { provinces } from '@/province/province'
import { districts } from '@/province/district'
import { communes } from '@/province/commune'

const { t } = useI18n()
const visible = ref(false)
const store = useDoctorStore()
const details = hospitalDetailStore()
const userStore = useAuthStore()
const commune = ref<any[]>([])
const district = ref<any[]>([])
const province = provinces
const id = ref('')
const editVisible = ref(false)
const activeTab = ref('information')
const newDep = ref({
  name: '',
  details: '',
  image: 'null'
})
const editData = ref({
  name: '',
  details: '',
  image: 'null'
})
const dialogVisible = ref(false)
const newDepPreview = ref('')
const editDepPreview = ref('')
const newDepFileInput = ref<HTMLInputElement | null>(null)
const editDepFileInput = ref<HTMLInputElement | null>(null)
const serviceCount = ref(0)
const formError = ref('')
const filterDistrict = (id: any) => {
  district.value = districts.filter((district) => district.province_id === id)
}
const filterCommune = (id: any) => {
  commune.value = communes.filter((commune) => commune.district_id === id)
}
const setLatLng = (commune: any) => {
  submissionFrom.value.latitude = commune.geodata.lat
  submissionFrom.value.longitude = commune.geodata.long
}
const onProvinceChange = (value: any) => {
  const match = province.find((p: any) => p.name_en === value)
  if (match) filterDistrict(match.id)
}
const onDistrictChange = (value: any) => {
  const match = district.value.find((d: any) => d.name_en === value)
  if (match) filterCommune(match.id)
}
const onCommuneChange = (value: any) => {
  const match = commune.value.find((c: any) => c.name_en === value)
  if (match) setLatLng(match)
}
const updateDepartment = (dep: any) => {
  editVisible.value = true
  id.value = dep.id
  editData.value = dep
  editDepPreview.value = ''
}
const removeDepartment = async (id: number) => {
  try {
    await axiosInstance.delete(`/departments/${id}`)
    toast.success(t('hospitalProfile.departmentRemoved'))
    fetchDetail()
  } catch (e) {
    toast.error(apiErrorMessage(e, t('hospitalProfile.departmentRemoveFailed')))
  }
}
const removeService = (id: number) => {
  console.log('remove serve ', id)
}
const updateService = (id: number) => {
  console.log('updateService ', id)
}
const onNewDepFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  newDep.value.image = file as unknown as string
  const reader = new FileReader()
  reader.onload = (e) => {
    newDepPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}
const onEditDepFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  editData.value.image = file as unknown as string
  const reader = new FileReader()
  reader.onload = (e) => {
    editDepPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}
const addDepartment = async () => {
  try {
    visible.value = false
    const formData = new FormData()
    formData.append('hospitalId', String(userStore.hospital.id))
    formData.append('name', newDep.value.name)
    if (newDep.value.details) {
      formData.append('details', newDep.value.details)
    }
    if (newDep.value.image && typeof newDep.value.image !== 'string') {
      formData.append('image', newDep.value.image as unknown as Blob)
    }
    await axiosInstance.post('/departments', formData)
    toast.success(t('hospitalProfile.departmentSaved'))
    newDepPreview.value = ''
    fetchDetail()
  } catch (error) {
    toast.error(apiErrorMessage(error, t('hospitalProfile.departmentFailed')))
  }
}
const updateDep = async () => {
  try {
    editVisible.value = false
    const formData = new FormData()
    formData.append('name', editData.value.name)
    if (editData.value.details) {
      formData.append('details', editData.value.details)
    }
    if (editData.value.image && typeof editData.value.image !== 'string') {
      formData.append('image', editData.value.image as unknown as Blob)
    }
    await axiosInstance.put(`/departments/${id.value}`, formData)
    toast.success(t('hospitalProfile.departmentSaved'))
    fetchDetail()
    editDepPreview.value = ''
  } catch (error) {
    toast.error(apiErrorMessage(error, t('hospitalProfile.departmentFailed')))
  }
}
const submissionFrom = ref({
  name: '',
  category_id: '',
  street_address: '',
  village: '',
  commune: '',
  district: '',
  province: '',
  latitude: '',
  longitude: '',
  open_time: '',
  close_time: '',
  phone_number: '',
  vision: '',
  mission: ''
})
const openEditForm = () => {
  dialogVisible.value = true
  formError.value = ''
  submissionFrom.value.phone_number = isBlank(details.hospitalDetail.phone_number) ? '' : details.hospitalDetail.phone_number
  submissionFrom.value.name = details.hospitalDetail.name
  submissionFrom.value.category_id = String(details.hospitalDetail.category.id)
  submissionFrom.value.street_address = details.hospitalDetail.street_address
  submissionFrom.value.village = details.hospitalDetail.village
  submissionFrom.value.commune = details.hospitalDetail.commune !== 'Not set yet' ? details.hospitalDetail.commune : ''
  submissionFrom.value.district = details.hospitalDetail.district
  submissionFrom.value.province = details.hospitalDetail.province
  submissionFrom.value.latitude = details.hospitalDetail.latitude
  submissionFrom.value.longitude = details.hospitalDetail.longitude
  submissionFrom.value.open_time = details.hospitalDetail.open_time
  submissionFrom.value.close_time = details.hospitalDetail.close_time
  submissionFrom.value.vision = details.hospitalDetail.vision
  submissionFrom.value.mission = details.hospitalDetail.mission
}
const categories = ref([])
let formData = ref({})
const fetchDetail = () => {
  details.fetchHospitalDetail(userStore.hospital.id)
  formData.value = details.hospitalDetail
}
const fetchServiceCount = async () => {
  try {
    const { data } = await axiosInstance.get('/hospital-services', { params: { hospitalId: userStore.hospital.id } })
    serviceCount.value = Array.isArray(data) ? data.length : 0
  } catch {
    serviceCount.value = 0
  }
}
// What the completeness card needs to do for each missing item.
const onOverviewAction = (key: CompletenessKey) => {
  if (key === 'departments') activeTab.value = 'department'
  else if (key === 'services') activeTab.value = 'service'
}
// Services are managed in another tab; recount when returning to the overview.
watch(activeTab, (tab) => tab === 'information' && fetchServiceCount())
const fetchCategory = async () => {
  try {
    const { data } = await axiosInstance.get('/categories/list')
    categories.value = data
    console.log(data)
  } catch (error) {
    console.log(error)
  }
}
const submitForm = async () => {
  const f = submissionFrom.value
  const hasOpen = !isBlank(f.open_time)
  const hasClose = !isBlank(f.close_time)
  if (isBlank(f.name)) formError.value = t('hospitalProfile.nameRequired')
  else if (isBlank(f.category_id)) formError.value = t('hospitalProfile.categoryRequired')
  else if (hasOpen !== hasClose) formError.value = t('hospitalProfile.timesBoth')
  else formError.value = ''
  if (formError.value) return
  try {
    await axiosInstance.put(`/hospitals/${details.hospitalDetail.id}`, toUpdatePayload(f))
    dialogVisible.value = false
    toast.success(t('hospitalProfile.saved'))
    fetchDetail()
  } catch (error) {
    // keep the dialog open so nothing typed is lost
    formError.value = apiErrorMessage(error, t('hospitalProfile.saveFailed'))
  }
}
onMounted(() => {
  store.fetchDoctors()
  fetchCategory()
  fetchDetail()
  fetchServiceCount()
})
</script>
<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="userStore.hospital != 'No hospital'">
    <Dialog v-model:open="dialogVisible">
      <DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.hospital.editHospital') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.hospital.name') }}</Label>
            <Input v-model="submissionFrom.name" type="text" />
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.hospital.category') }}</Label>
            <Select v-model="submissionFrom.category_id">
              <SelectTrigger class="w-full"><SelectValue :placeholder="t('hospitalDash.hospital.selectCategory')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="category in categories" :key="category.id" :value="String(category.id)">{{ category.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.hospital.phone') }}</Label>
            <Input v-model="submissionFrom.phone_number" type="tel" autocomplete="tel" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.openTime') }}</Label>
              <Input v-model="submissionFrom.open_time" type="time" />
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.closeTime') }}</Label>
              <Input v-model="submissionFrom.close_time" type="time" />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.province') }}</Label>
              <Select v-model="submissionFrom.province" @update:model-value="onProvinceChange">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('hospitalDash.hospital.selectProvince')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in province" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.district') }}</Label>
              <Select v-model="submissionFrom.district" @update:model-value="onDistrictChange">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('hospitalDash.hospital.selectDistrict')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in district" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.commune') }}</Label>
              <Select v-model="submissionFrom.commune" @update:model-value="onCommuneChange">
                <SelectTrigger class="w-full"><SelectValue :placeholder="t('hospitalDash.hospital.selectCommune')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in commune" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.village') }}</Label>
              <Input v-model="submissionFrom.village" type="text" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('hospitalDash.hospital.streetAddress') }}</Label>
            <Input v-model="submissionFrom.street_address" type="text" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.vision') }}</Label>
              <Textarea v-model="submissionFrom.vision" />
            </div>
            <div class="space-y-1.5">
              <Label>{{ t('hospitalDash.hospital.mission') }}</Label>
              <Textarea v-model="submissionFrom.mission" />
            </div>
          </div>
        </div>
        <p v-if="formError" role="alert" class="text-sm font-medium text-destructive">{{ formError }}</p>
        <DialogFooter>
          <Button variant="outline" @click="dialogVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="submitForm">{{ t('hospitalDash.hospital.submit') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Card class="mt-6">
      <CardContent>
        <Tabs v-model="activeTab">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="information">{{ t('hospitalDash.hospital.tabInformation') }}</TabsTrigger>
            <TabsTrigger value="department">{{ t('hospitalDash.hospital.tabDepartment') }}</TabsTrigger>
            <TabsTrigger value="service">{{ t('hospitalDash.hospital.tabService') }}</TabsTrigger>
          </TabsList>
          <TabsContent value="information">
            <CoverUploader :hospital-id="details.hospitalDetail.id" :cover="details.hospitalDetail.cover_image" @uploaded="fetchDetail" />
            <div class="mt-6">
              <ProfileOverview :hospital="details.hospitalDetail" :service-count="serviceCount" @edit="openEditForm" @action="onOverviewAction" />
            </div>
          </TabsContent>
          <TabsContent value="department">
            <div class="flex items-center justify-between">
              <SectionHeading :kicker="t('hospitalDash.hospital.departmentsKicker')">
                <template #title>{{ t('hospitalDash.hospital.departments') }}</template>
              </SectionHeading>
              <UiButton variant="primary" @click="visible = true">{{ t('hospitalDash.hospital.addDepartment') }}</UiButton>
            </div>
            <Dialog v-model:open="visible">
              <DialogContent class="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{{ t('hospitalDash.hospital.addNewDepartment') }}</DialogTitle>
                </DialogHeader>
                <div class="space-y-4">
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depName') }}</Label>
                    <Input v-model="newDep.name" type="text" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depDescription') }}</Label>
                    <Textarea v-model="newDep.details" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depImage') }}</Label>
                    <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
                      <img v-if="newDepPreview" :src="newDepPreview" alt="" class="h-32 w-32 rounded-xl object-cover" />
                      <Button type="button" variant="outline" size="sm" @click="newDepFileInput?.click()">
                        <UploadIcon class="size-4" />
                        {{ t('hospitalDash.hospital.chooseImage') }}
                      </Button>
                      <input ref="newDepFileInput" type="file" accept="image/*" class="hidden" @change="onNewDepFileChange" />
                      <p class="text-xs text-muted-foreground">{{ t('hospitalDash.hospital.imageHint') }}</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" @click="visible = false">{{ t('hospitalDash.cancel') }}</Button>
                  <Button @click="addDepartment">{{ t('hospitalDash.hospital.submit') }}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog v-model:open="editVisible">
              <DialogContent class="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{{ t('hospitalDash.hospital.editDepartment') }}</DialogTitle>
                </DialogHeader>
                <div class="space-y-4">
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depName') }}</Label>
                    <Input v-model="editData.name" type="text" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depDescription') }}</Label>
                    <Textarea v-model="editData.details" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>{{ t('hospitalDash.hospital.depImage') }}</Label>
                    <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
                      <img v-if="editDepPreview" :src="editDepPreview" alt="" class="h-32 w-32 rounded-xl object-cover" />
                      <Button type="button" variant="outline" size="sm" @click="editDepFileInput?.click()">
                        <UploadIcon class="size-4" />
                        {{ t('hospitalDash.hospital.chooseImage') }}
                      </Button>
                      <input ref="editDepFileInput" type="file" accept="image/*" class="hidden" @change="onEditDepFileChange" />
                      <p class="text-xs text-muted-foreground">{{ t('hospitalDash.hospital.imageHint') }}</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" @click="editVisible = false">{{ t('hospitalDash.cancel') }}</Button>
                  <Button @click="updateDep">{{ t('hospitalDash.hospital.submit') }}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div class="mt-6 space-y-4">
              <CardDepartment
                v-for="dep in details.hospitalDetail.department"
                :key="dep.id"
                :department="dep"
                @update="updateDepartment(dep)"
                @remove="removeDepartment(dep.id)"
              />
            </div>
          </TabsContent>
          <TabsContent value="service">
            <ServiceTab @remove="removeService(id)" @update="updateService(id)" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
