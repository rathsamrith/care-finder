<template>
  <WebLayout>
    <section class="overflow-hidden rounded-[1.25rem] shadow-soft lg:grid lg:grid-cols-2">
      <div class="h-64 lg:h-full">
        <img
          v-if="store.hospitalDetail.cover_image !== 'No Cover'"
          :src="store.hospitalDetail.cover_image"
          :alt="t('hospitalDetail.coverAlt')"
          class="h-full w-full object-cover"
        />
        <img v-else src="@/assets/image/hospital1.png" :alt="t('hospitalDetail.coverAlt')" class="h-full w-full object-cover" />
      </div>
      <div class="flex flex-col justify-center bg-navy px-6 py-10 sm:px-10 lg:py-14">
        <h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {{ store.hospitalDetail.name }}
        </h1>
        <p class="mt-4 text-sm leading-6 text-white/80">{{ t('hospitalDetail.open') }}</p>
        <p class="mt-1 text-sm leading-6 text-white/80">
          {{
            t('hospitalDetail.location', {
              village: store.hospitalDetail.village,
              commune: store.hospitalDetail.commune,
              street: store.hospitalDetail.street,
              province: store.hospitalDetail.province
            })
          }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <StarRating :model-value="store.hospitalDetail.average_rating" readonly :size="24" />
          <span class="text-sm font-medium text-gold">{{ t('hospitalDetail.points', { rating: store.hospitalDetail.average_rating }) }}</span>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <DirectionsButton
            v-if="store.hospitalDetail.latitude && store.hospitalDetail.longitude"
            variant="default"
            :latitude="store.hospitalDetail.latitude"
            :longitude="store.hospitalDetail.longitude"
          />
          <UiButton variant="outline" @click="correctionFormOpen = true">{{ t('hospitalDetail.suggestEdit') }}</UiButton>
        </div>
      </div>
    </section>

    <CorrectionSubmissionForm
      v-model="correctionFormOpen"
      :hospital-id="store.hospitalDetail.id"
      :hospital-name="store.hospitalDetail.name"
    />

    <section class="mt-10">
      <Card padding="p-4 sm:p-8">
        <Tabs v-model="activeName">
          <TabsList class="w-full">
            <TabsTrigger value="overview" class="flex-1">{{ t('hospitalDetail.tabOverview') }}</TabsTrigger>
            <TabsTrigger value="booking" class="flex-1">{{ t('hospitalDetail.tabBooking') }}</TabsTrigger>
            <TabsTrigger value="services" class="flex-1">{{ t('hospitalDetail.tabServices') }}</TabsTrigger>
            <TabsTrigger value="departments" class="flex-1">{{ t('hospitalDetail.tabDepartments') }}</TabsTrigger>
            <TabsTrigger value="doctors" class="flex-1">{{ t('hospitalDetail.tabDoctors') }}</TabsTrigger>
            <TabsTrigger value="reviews" class="flex-1">{{ t('hospitalDetail.tabReviews') }}</TabsTrigger>
            <TabsTrigger value="gallery" class="flex-1">{{ t('hospitalDetail.tabGallery') }}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab
              :phone-number="store.hospitalDetail.phone_number"
              :address="hospitalAddress"
              :hours="hospitalHours"
              :mission="store.hospitalDetail.mission"
              :vision="store.hospitalDetail.vision"
              :category-description="store.hospitalDetail.category?.description"
              :services="servicesPreview"
              @view-all-services="activeName = 'services'"
            />
          </TabsContent>
          <TabsContent value="booking">
            <CalendarTab :appointments="store.appointment" :current-user-id="user.user.id" />
          </TabsContent>
          <TabsContent value="services">
            <ServicesTab :services="services" />
          </TabsContent>
          <TabsContent value="departments">
            <DepartmentsTab :department="store.hospitalDetail.department" />
          </TabsContent>
          <TabsContent value="doctors">
            <DoctorsTab :doctors="store.hospitalDetail.doctors" />
          </TabsContent>
          <TabsContent value="reviews">
            <CommentsTab
              :feedbacks="store.hospitalDetail.feedbacks"
              @submit="onSubmit"
              @edit-comment="editComment"
              @show-replies="showReplies"
            />
          </TabsContent>
          <TabsContent value="gallery">
            <GalleryTab :images="galleryImages" />
          </TabsContent>
        </Tabs>
      </Card>
    </section>

    <Dialog v-model:open="editActive">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDetail.editRate') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <Input v-model="editForm.content" :placeholder="t('hospitalDetail.commentPlaceholder')" />
          <div>
            <h4 class="text-sm font-semibold text-ink">{{ t('hospitalDetail.rateThis') }}</h4>
            <p class="text-sm text-slate-500">{{ t('hospitalDetail.tellOthers') }}</p>
            <StarRating v-model="editForm.star" :size="24" class="mt-2" />
          </div>
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="editActive = false">{{ t('hospitalDetail.cancel') }}</UiButton>
          <UiButton variant="primary" @click="editRate">{{ t('hospitalDetail.submit') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="outerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ store.hospitalDetail.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <Card v-for="rep in feedBackreplies" :key="rep.id" variant="muted" padding="p-4">
            <div class="flex items-center justify-between">
              <h5 class="text-sm font-semibold text-ink">{{ rep.user.name }}</h5>
              <span class="text-xs text-slate-500">{{ rep.created_at }}</span>
            </div>
            <p class="mt-2 text-sm text-slate-600">{{ rep.content }}</p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  </WebLayout>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import CommentsTab from '@/components/hospital/detail/comments-tab.vue'
import DoctorsTab from '@/components/hospital/detail/doctors-tab.vue'
import DepartmentsTab from '@/components/hospital/detail/departments-tab.vue'
import CalendarTab from '@/components/hospital/detail/calendar-tab.vue'
import OverviewTab from '@/components/hospital/detail/overview-tab.vue'
import ServicesTab from '@/components/hospital/detail/services-tab.vue'
import GalleryTab from '@/components/hospital/detail/gallery-tab.vue'
import DirectionsButton from '@/components/discovery/directions-button.vue'
import CorrectionSubmissionForm from '@/components/discovery/correction-submission-form.vue'
import StarRating from '@/components/ui/star-rating/star-rating.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import { useAuthStore } from '@/stores/auth-store'
import { useRoute } from 'vue-router'
import axiosInstance from '@/plugins/axios'

const { t } = useI18n()
const store = hospitalDetailStore()
const user = useAuthStore()
const route = useRoute()

const editForm = reactive({
  id: '',
  hospital_id: route.query.id,
  user_id: user.user.id,
  content: '',
  star: ''
})
let feedBackreplies: any[] = []
const outerVisible = ref(false)
const editActive = ref(false)
const correctionFormOpen = ref(false)
const activeName = ref('overview')

// `/preview-images` stores each row's `imageName` as a storage-relative path
// (unlike the hospital endpoints, it doesn't pre-resolve a full URL) - build
// the same `{publicUrl}/{relativePath}` shape as FileStorageService.resolveUrl.
const PREVIEW_IMAGE_BASE_URL = 'http://127.0.0.1:3001/uploads'
const previewImages = ref<{ image: string }[]>([])

const galleryImages = computed(() =>
  previewImages.value.length > 0
    ? previewImages.value
    : [{ image: store.hospitalDetail.cover_image }].filter((item) => item.image && item.image !== 'No Cover')
)

const hospitalAddress = computed(() => {
  const hospital = store.hospitalDetail
  const parts = [hospital.street_address, hospital.village, hospital.commune, hospital.district, hospital.province]
  return parts.filter(Boolean).join(', ')
})

const hospitalHours = computed(() => {
  const hospital = store.hospitalDetail
  if (!hospital.open_time || !hospital.close_time) return ''
  return `${hospital.open_time} - ${hospital.close_time}`
})

const fetchPreviewImages = async () => {
  try {
    const { data } = await axiosInstance.get('/preview-images', { params: { hospitalId: route.query.id } })
    previewImages.value = (data as { imageName: string }[]).map((item) => ({
      image: `${PREVIEW_IMAGE_BASE_URL}/${item.imageName}`
    }))
  } catch (error) {
    console.log(error)
  }
}

const services = ref<{ id: number; name: string; image: string | null; description: string | null }[]>([])
const servicesPreview = computed(() => services.value.slice(0, 4))

const fetchServices = async () => {
  try {
    const { data } = await axiosInstance.get('/hospital-services', { params: { hospitalId: route.query.id } })
    services.value = (data as any[]).map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image ? `${PREVIEW_IMAGE_BASE_URL}/${item.image}` : null,
      description: item.description ?? null
    }))
  } catch (error) {
    console.log(error)
  }
}

const onSubmit = (payload: { content: string; star: number }) => {
  store.submitFeedback({
    hospitalId: route.query.id,
    content: payload.content,
    star: payload.star
  })
  store.fetchHospitalDetail(route.query.id)
}

const editRate = async () => {
  editActive.value = false
  try {
    const { data } = await axiosInstance.put(`/rates/${editForm.id}`, {
      content: editForm.content,
      star: Number(editForm.star)
    })
    console.log(data)
    store.fetchHospitalDetail(route.query.id)
  } catch (error) {
    console.log(error)
  }
}

const showReplies = (replies: any[]) => {
  outerVisible.value = true
  feedBackreplies = replies
}

const editComment = (comment: any) => {
  editActive.value = true
  editForm.id = comment.id
  editForm.hospital_id = route.query.id
  editForm.content = comment.content
  editForm.star = comment.star
}

onMounted(() => {
  store.fetchHospitalDetail(route.query.id)
  fetchPreviewImages()
  fetchServices()
})
</script>
