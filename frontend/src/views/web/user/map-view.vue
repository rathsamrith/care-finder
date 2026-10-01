<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import LocationPermissionDialog from '@/components/discovery/location-permission-dialog.vue'
import { useLocationPermission } from '@/composables/use-location-permission'
import { config, Map, MapStyle, Marker, Popup } from '@maptiler/sdk'
import { useI18n } from 'vue-i18n'
import { markRaw, onMounted, onUnmounted, shallowRef } from 'vue'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import axiosInstance from '@/plugins/axios'
const { t } = useI18n()
const mapContainer = shallowRef<HTMLElement | null>(null)
const map = shallowRef<any>(null)
const { showDialog: showLocationDialog, ensureLocation, allow: allowLocation } = useLocationPermission()
const coordinate = { lng: 0, lat: 0, acc: 0 }

function showPosition(position: any) {
  coordinate.lng = position.coords.longitude
  coordinate.lat = position.coords.latitude
  coordinate.acc = position.coords.accuracy
  console.log(coordinate)
}
async function fetchHospital() {
  try {
    const { data } = await axiosInstance.get('/hospitals/list')
    data.forEach((hospital: any) => {
      if (hospital.latitude == null || hospital.longitude == null) return
      new Marker({ color: '#176B5B' })
        .setLngLat([Number(hospital.longitude), Number(hospital.latitude)])
        .setPopup(new Popup({ offset: 30 }).setText(hospital.name))
        .addTo(map.value)
    })
  } catch (error) {
    console.log(error)
    return null
  }
}
onMounted(() => {
  config.apiKey = 'EuM9QQJGrvW9fu5g98Sm'
  const initialState = { lng: 104.888535, lat: 11.562108, zoom: 10 }
  map.value = markRaw(
    new Map({
      container: mapContainer.value as HTMLElement,
      style: MapStyle.STREETS,
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom
    })
  )
  fetchHospital()
  ensureLocation((position) => {
    if (position) showPosition(position)
  })
})
onUnmounted(() => {
  map.value?.remove()
})
</script>
<template>
  <WebLayout>
    <SectionHeading :kicker="t('map.kicker')">
      <template #title>{{ t('map.title') }}</template>
    </SectionHeading>
    <div class="relative mt-6 h-[calc(100vh-220px)] min-h-[420px] w-full overflow-hidden rounded-[1.25rem] shadow-soft">
      <div ref="mapContainer" class="absolute inset-0 h-full w-full"></div>
    </div>

    <LocationPermissionDialog v-model="showLocationDialog" @allow="allowLocation" />
  </WebLayout>
</template>
