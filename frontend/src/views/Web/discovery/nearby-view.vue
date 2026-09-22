<template>
  <WebLayout>
    <SectionHeading :kicker="t('discovery.nearby.kicker')">
      <template #title>{{ t('discovery.nearby.title') }}</template>
    </SectionHeading>

    <Card v-if="locationState === 'denied' || locationState === 'unavailable'" padding="p-6" class="mt-6">
      <p class="text-sm text-slate-600">
        {{
          locationState === 'denied'
            ? t('discovery.nearby.denied')
            : t('discovery.nearby.unavailable')
        }}
      </p>
      <div class="mt-4 flex flex-col gap-3 sm:flex-row">
        <Select v-model="manualProvince">
          <SelectTrigger class="w-full sm:w-60">
            <SelectValue :placeholder="t('discovery.nearby.selectProvince')" />
          </SelectTrigger>
          <SelectContent class="max-h-64">
            <SelectItem v-for="province in provinces" :key="province" :value="province">{{ province }}</SelectItem>
          </SelectContent>
        </Select>
        <UiButton variant="primary" :disabled="!manualProvince" @click="useManualLocation">{{ t('discovery.nearby.useProvince') }}</UiButton>
      </div>
    </Card>

    <LoadingSkeleton v-else-if="locationState === 'locating' || loading" class="mt-6" :rows="4" />

    <EmptyState
      v-else-if="nearbyHospitals.length === 0"
      class="mt-6"
      :title="t('discovery.nearby.emptyTitle')"
      :message="t('discovery.nearby.emptyMessage')"
    />

    <template v-else>
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
        <i18n-t keypath="discovery.nearby.showing" tag="p" class="text-sm text-slate-600">
          <template #count>
            <span class="font-mono font-semibold text-ink">{{ nearbyHospitals.length }}</span>
          </template>
        </i18n-t>
        <Select v-model="maxDistanceKm">
          <SelectTrigger class="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="d in [5, 10, 25, 50, 100]" :key="d" :value="d">{{ t('discovery.kmUnit', { n: d }) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="hospital in nearbyHospitals" :key="hospital.id" class="cf-card p-5">
          <h4 class="text-base font-semibold text-ink">{{ hospital.name }}</h4>
          <p class="mt-1 text-sm text-slate-600">{{ hospital.province }}</p>
          <p class="mt-2 font-mono text-sm font-semibold text-accent-dark">{{ t('discovery.kmAway', { n: hospital.distanceKm.toFixed(1) }) }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <DirectionsButton v-if="hospital.lat && hospital.lng" :latitude="hospital.lat" :longitude="hospital.lng" />
            <UiButton v-if="hospital.phone_number" variant="link" :href="`tel:${hospital.phone_number}`">
              <PhoneIcon class="size-3.5" />
              {{ t('discovery.nearby.call') }}
            </UiButton>
          </div>
        </article>
      </div>
    </template>

    <LocationPermissionDialog v-model="showLocationDialog" @allow="allowLocation" @deny="denyLocation" />
  </WebLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneIcon } from '@lucide/vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import EmptyState from '@/components/ui/empty-state.vue'
import LoadingSkeleton from '@/components/ui/loading-skeleton.vue'
import DirectionsButton from '@/components/discovery/directions-button.vue'
import LocationPermissionDialog from '@/components/discovery/location-permission-dialog.vue'
import { useLocationPermission } from '@/composables/use-location-permission'
import axiosInstance from '@/plugins/axios'

const { t } = useI18n()

const provinces = [
  'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Thom',
  'Kampong Speu', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratié', 'Mondulkiri',
  'Oddar Meanchey', 'Pailin', 'Phnom Penh', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng',
  'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takéo', 'Tboung Khmum'
]

const provinceCenters: Record<string, { lat: number; lng: number }> = {
  'Phnom Penh': { lat: 11.562108, lng: 104.888535 }
}
const defaultCenter = { lat: 11.562108, lng: 104.888535 }

const locationState = ref<'locating' | 'ready' | 'denied' | 'unavailable'>('locating')
const loading = ref(true)
const hospitals = ref<any[]>([])
const origin = ref<{ lat: number; lng: number } | null>(null)
const manualProvince = ref('')
const maxDistanceKm = ref(25)
const { showDialog: showLocationDialog, ensureLocation, allow: allowLocation, deny: denyLocation } =
  useLocationPermission()

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

const nearbyHospitals = computed(() => {
  if (!origin.value) return []
  return hospitals.value
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => ({
      ...h,
      lat: Number(h.latitude),
      lng: Number(h.longitude),
      distanceKm: haversineKm(origin.value!, { lat: Number(h.latitude), lng: Number(h.longitude) })
    }))
    .filter((h) => h.distanceKm <= maxDistanceKm.value)
    .sort((a, b) => a.distanceKm - b.distanceKm)
})

function useManualLocation() {
  origin.value = provinceCenters[manualProvince.value] ?? defaultCenter
  locationState.value = 'ready'
}

async function fetchHospitals() {
  try {
    const { data } = await axiosInstance.get('/hospitals/list')
    hospitals.value = data ?? []
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHospitals()
  if (!navigator.geolocation) {
    locationState.value = 'unavailable'
    return
  }
  locationState.value = 'locating'
  ensureLocation((position) => {
    if (position) {
      origin.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      locationState.value = 'ready'
    } else {
      locationState.value = 'denied'
    }
  })
})
</script>
