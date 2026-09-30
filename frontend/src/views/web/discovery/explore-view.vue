<template>
  <WebLayout>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <SectionHeading :kicker="t('discovery.explore.kicker')">
        <template #title>{{ t('discovery.explore.title') }}</template>
        <template #subtitle>{{ t('discovery.explore.subtitle') }}</template>
      </SectionHeading>
      <a
        href="tel:119"
        class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
      >
        <PhoneIcon class="size-4" />
        {{ t('discovery.explore.emergencyCall') }}
      </a>
    </div>

    <div class="mt-6 space-y-4">
      <HospitalSearchBar
        :categories="categories"
        :selected-categories="selectedCategories"
        :query="query"
        @update:selected-categories="(v) => (selectedCategories = v)"
        @update:query="(v) => (query = v)"
        @submit="resultsRef?.scrollIntoView({ behavior: 'smooth' })"
      />
      <HospitalFilterChipsBar
        :provinces="provinces"
        :selected-provinces="selectedProvinces"
        :max-distance-km="maxDistanceKm"
        :has-origin="origin != null"
        :open-now-only="openNowOnly"
        :top-rated-only="topRatedOnly"
        @update:selected-provinces="(v) => (selectedProvinces = v)"
        @update:max-distance-km="(v) => (maxDistanceKm = v)"
        @update:open-now-only="(v) => (openNowOnly = v)"
        @update:top-rated-only="(v) => (topRatedOnly = v)"
      />
    </div>

    <div ref="resultsRef" class="mt-6 scroll-mt-24">
      <SearchResultsToolbar
        :count="filteredHospitals.length"
        :sort-by="sortBy"
        :sort-options="sortOptions"
        :view="view"
        @update:sort-by="(v) => (sortBy = v)"
        @update:view="(v) => (view = v)"
      />
    </div>

    <div v-if="loading" class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="n in 6" :key="n" class="overflow-hidden py-0">
        <Skeleton class="h-40 w-full rounded-none" />
        <CardContent class="space-y-3 p-5">
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-1/2" />
          <Skeleton class="h-3 w-1/3" />
        </CardContent>
      </Card>
    </div>

    <Card v-else-if="filteredHospitals.length === 0" class="mt-6">
      <CardContent class="flex flex-col items-center py-16 text-center">
        <SearchXIcon class="size-10 text-muted-foreground" />
        <h3 class="mt-4 text-base font-semibold text-foreground">{{ t('discovery.explore.noMatchTitle') }}</h3>
        <p class="mt-2 max-w-sm text-sm text-muted-foreground">{{ t('discovery.explore.noMatchHint') }}</p>
        <Button variant="outline" class="mt-6" @click="clearFilters">{{ t('discovery.explore.clearFilters') }}</Button>
      </CardContent>
    </Card>

    <div v-else class="mt-6 grid gap-6" :class="view === 'split' ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''">
      <div v-if="view !== 'map'" class="grid gap-6" :class="view === 'split' ? '' : 'sm:grid-cols-2 xl:grid-cols-3'">
        <HospitalResultCard
          v-for="hospital in visibleHospitals"
          :key="hospital.id"
          :hospital="hospital"
          :selected="hospital.id === selectedId"
          @select="selectedId = hospital.id"
          @details="goToDetails"
          @favorite="addToFavorites"
        />
      </div>
      <div
        v-if="view !== 'list'"
        class="relative h-[60vh] overflow-hidden rounded-xl shadow-soft lg:sticky lg:top-24 lg:h-[calc(100vh-220px)]"
      >
        <HospitalMap
          :hospitals="mapHospitals"
          :selected-id="selectedId"
          v-model:search-as-move="searchAsMove"
          @select="selectedId = $event"
          @bounds-change="visibleBounds = $event"
        />
        <div v-if="selectedMapHospital" class="absolute inset-x-3 bottom-3 z-10">
          <HospitalMapInfoCard :hospital="selectedMapHospital" @close="selectedId = null" />
        </div>
      </div>
    </div>

    <div
      v-if="view !== 'map' && visibleCount < filteredHospitals.length"
      ref="loadMoreSentinelRef"
      class="mt-6 flex flex-col items-center gap-2 py-4"
    >
      <Loader2Icon class="size-5 animate-spin text-muted-foreground" />
      <p class="text-sm text-muted-foreground">{{ t('discovery.explore.loadingMore') }}</p>
    </div>

    <LocationPermissionDialog v-model="showLocationDialog" @allow="allowLocation" />
  </WebLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Loader2Icon, PhoneIcon, SearchXIcon } from '@lucide/vue'
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import HospitalSearchBar from '@/components/discovery/hospital-search-bar.vue'
import HospitalFilterChipsBar from '@/components/discovery/hospital-filter-chips-bar.vue'
import SearchResultsToolbar from '@/components/discovery/search-results-toolbar.vue'
import HospitalResultCard from '@/components/discovery/hospital-result-card.vue'
import HospitalMap, { type MapBounds } from '@/components/discovery/hospital-map.vue'
import HospitalMapInfoCard from '@/components/discovery/hospital-map-info-card.vue'
import LocationPermissionDialog from '@/components/discovery/location-permission-dialog.vue'
import { useLocationPermission } from '@/composables/use-location-permission'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import { toast } from 'vue-sonner'

const PAGE_SIZE = 6

const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const details = hospitalDetailStore()

const loading = ref(true)
const hospitals = ref<any[]>([])
const categories = ref<{ id: string | number; name: string }[]>([])
const resultsRef = ref<HTMLElement | null>(null)

const provinces = [
  'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Thom',
  'Kampong Speu', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratié', 'Mondulkiri',
  'Oddar Meanchey', 'Pailin', 'Phnom Penh', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng',
  'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takéo', 'Tboung Khmum'
]

// Pre-filter from a homepage/category-pill link (e.g. `/explore?category=Clinic`).
const selectedProvinces = ref<string[]>(route.query.province ? [String(route.query.province)] : [])
const selectedCategories = ref<string[]>(route.query.category ? [String(route.query.category)] : [])
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const topRatedOnly = ref(false)
const openNowOnly = ref(false)
const sortBy = ref('recommended')
const sortOptions = computed(() => [
  { value: 'recommended', label: t('discovery.explore.sort.recommended') },
  { value: 'rating', label: t('discovery.explore.sort.rating') },
  { value: 'name', label: t('discovery.explore.sort.name') },
  { value: 'distance', label: t('discovery.explore.sort.distance') }
])
const view = ref<'split' | 'list' | 'map'>('split')
const selectedId = ref<string | number | null>(null)
const visibleCount = ref(PAGE_SIZE)

const origin = ref<{ lat: number; lng: number } | null>(null)
const maxDistanceKm = ref<number | null>(null)
const searchAsMove = ref(false)
const visibleBounds = ref<MapBounds | null>(null)
const { showDialog: showLocationDialog, ensureLocation, allow: allowLocation } = useLocationPermission()

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function isOpenNow(openTime?: string | null, closeTime?: string | null): boolean {
  if (!openTime || !closeTime) return false
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const open = toMinutes(openTime)
  const close = toMinutes(closeTime)
  if (close <= open) return nowMinutes >= open || nowMinutes < close
  return nowMinutes >= open && nowMinutes < close
}

const hospitalsWithDistance = computed(() =>
  hospitals.value.map((h) => ({
    ...h,
    distanceKm:
      origin.value && h.latitude != null && h.longitude != null
        ? haversineKm(origin.value, { lat: Number(h.latitude), lng: Number(h.longitude) })
        : undefined
  }))
)

const filteredHospitals = computed(() => {
  let list = hospitalsWithDistance.value.filter((hospital) => {
    const matchesQuery = !query.value || hospital.name.toLowerCase().includes(query.value.toLowerCase())
    const matchesProvince = selectedProvinces.value.length === 0 || selectedProvinces.value.includes(hospital.province)
    const matchesCategory =
      selectedCategories.value.length === 0 || selectedCategories.value.includes(hospital.category?.name)
    const matchesRating = !topRatedOnly.value || (hospital.average_rating ?? 0) >= 4.5
    const matchesOpenNow = !openNowOnly.value || isOpenNow(hospital.open_time, hospital.close_time)
    const matchesDistance =
      maxDistanceKm.value == null ||
      (hospital.distanceKm != null && hospital.distanceKm <= maxDistanceKm.value)
    const matchesBounds =
      !searchAsMove.value ||
      !visibleBounds.value ||
      hospital.latitude == null ||
      hospital.longitude == null ||
      (Number(hospital.latitude) <= visibleBounds.value.north &&
        Number(hospital.latitude) >= visibleBounds.value.south &&
        Number(hospital.longitude) <= visibleBounds.value.east &&
        Number(hospital.longitude) >= visibleBounds.value.west)
    return (
      matchesQuery &&
      matchesProvince &&
      matchesCategory &&
      matchesRating &&
      matchesOpenNow &&
      matchesDistance &&
      matchesBounds
    )
  })
  if (sortBy.value === 'rating') {
    list = [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
  } else if (sortBy.value === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'distance') {
    list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  }
  return list
})

const visibleHospitals = computed(() => filteredHospitals.value.slice(0, visibleCount.value))

const mapHospitals = computed(() =>
  filteredHospitals.value
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => ({ id: h.id, name: h.name, lat: Number(h.latitude), lng: Number(h.longitude) }))
)

const selectedMapHospital = computed(() => filteredHospitals.value.find((h) => h.id === selectedId.value) ?? null)

watch([selectedProvinces, selectedCategories, query, topRatedOnly, openNowOnly, maxDistanceKm], () => {
  visibleCount.value = PAGE_SIZE
})

// Infinite scroll: grow visibleCount as the sentinel below the results enters
// the viewport, instead of a manual "load more" button.
const loadMoreSentinelRef = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

function loadMore() {
  if (visibleCount.value < filteredHospitals.value.length) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredHospitals.value.length)
  }
}

watch(loadMoreSentinelRef, (el) => {
  sentinelObserver?.disconnect()
  if (el) sentinelObserver?.observe(el)
})

onMounted(() => {
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    },
    { rootMargin: '200px' }
  )
  if (loadMoreSentinelRef.value) sentinelObserver.observe(loadMoreSentinelRef.value)
})

onUnmounted(() => sentinelObserver?.disconnect())

function clearFilters() {
  selectedProvinces.value = []
  selectedCategories.value = []
  query.value = ''
  topRatedOnly.value = false
  openNowOnly.value = false
  maxDistanceKm.value = null
}

function goToDetails(id: string | number) {
  details.id = id
  router.push(`/hospital/detail?id=${id}`)
  details.fetchHospitalDetail(id)
}

async function addToFavorites(id: string | number) {
  try {
    const { data } = await axiosInstance.post('/favourites/create', {
      user_id: authStore.user?.id,
      hospital_id: id
    })
    data.success ? toast.success(data.message) : toast.warning(data.message)
  } catch (error) {
    console.log(error)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [{ data: hospitalData }, { data: categoryData }] = await Promise.all([
      axiosInstance.get('/hospitals/list'),
      axiosInstance.get('/categories/list')
    ])
    hospitals.value = hospitalData ?? []
    categories.value = categoryData ?? []
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  ensureLocation((position) => {
    // Location denied/unavailable - distance-away simply doesn't render, no fallback guess.
    if (position) {
      origin.value = { lat: position.coords.latitude, lng: position.coords.longitude }
    }
  })
})
</script>
