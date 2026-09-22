<script setup lang="ts">
import { config, Map, MapStyle, Marker, Popup } from '@maptiler/sdk'
import { markRaw, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { Button } from '@/components/ui/button'
import { useI18n } from 'vue-i18n'

type MapHospital = {
  id: string | number
  name: string
  lat: number
  lng: number
}

export type MapBounds = { north: number; south: number; east: number; west: number }

const props = withDefaults(
  defineProps<{
    hospitals: MapHospital[]
    selectedId?: string | number | null
    center?: { lat: number; lng: number }
    zoom?: number
    searchAsMove?: boolean
  }>(),
  {
    selectedId: null,
    center: () => ({ lat: 11.562108, lng: 104.888535 }),
    zoom: 10,
    searchAsMove: false
  }
)

const emit = defineEmits<{
  (e: 'select', id: string | number): void
  (e: 'update:searchAsMove', value: boolean): void
  (e: 'bounds-change', bounds: MapBounds): void
}>()

const { t } = useI18n()

const mapContainer = shallowRef<HTMLDivElement | null>(null)
const map = shallowRef<Map | null>(null)
const markers = new globalThis.Map<string | number, Marker>()
const mapStyle = ref<'streets' | 'satellite'>('streets')

function renderMarkers(hospitals: MapHospital[]) {
  if (!map.value) return
  markers.forEach((marker) => marker.remove())
  markers.clear()
  hospitals.forEach((hospital) => {
    if (hospital.lat == null || hospital.lng == null) return
    const marker = new Marker({ color: '#176B5B' })
      .setLngLat([hospital.lng, hospital.lat])
      .setPopup(new Popup({ offset: 30 }).setText(hospital.name))
      .addTo(map.value!)
    marker.getElement().addEventListener('click', () => emit('select', hospital.id))
    markers.set(hospital.id, marker)
  })
}

function setStyle(style: 'streets' | 'satellite') {
  mapStyle.value = style
  map.value?.setStyle(style === 'satellite' ? MapStyle.SATELLITE : MapStyle.STREETS)
}

function emitBounds() {
  if (!map.value || !props.searchAsMove) return
  const bounds = map.value.getBounds()
  emit('bounds-change', {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  })
}

watch(() => props.hospitals, renderMarkers, { deep: true })

watch(
  () => props.selectedId,
  (id) => {
    if (id == null || !map.value) return
    const hospital = props.hospitals.find((h) => h.id === id)
    if (hospital) {
      map.value.flyTo({ center: [hospital.lng, hospital.lat], zoom: Math.max(props.zoom, 13) })
    }
  }
)

onMounted(() => {
  config.apiKey = 'EuM9QQJGrvW9fu5g98Sm'
  map.value = markRaw(
    new Map({
      container: mapContainer.value!,
      style: MapStyle.STREETS,
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom
    })
  )
  map.value.on('load', () => renderMarkers(props.hospitals))
  map.value.on('moveend', emitBounds)
})

onUnmounted(() => {
  markers.forEach((marker) => marker.remove())
  markers.clear()
  map.value?.remove()
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="mapContainer" class="h-full w-full"></div>

    <div class="absolute right-3 top-3 z-10 flex overflow-hidden rounded-lg border border-border bg-background shadow-soft">
      <Button
        :variant="mapStyle === 'streets' ? 'default' : 'ghost'"
        size="sm"
        class="rounded-none"
        @click="setStyle('streets')"
      >
        {{ t('discovery.map.standard') }}
      </Button>
      <Button
        :variant="mapStyle === 'satellite' ? 'default' : 'ghost'"
        size="sm"
        class="rounded-none"
        @click="setStyle('satellite')"
      >
        {{ t('discovery.map.satellite') }}
      </Button>
    </div>

    <label
      class="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-soft"
    >
      <input
        type="checkbox"
        class="accent-primary"
        :checked="searchAsMove"
        @change="emit('update:searchAsMove', ($event.target as HTMLInputElement).checked)"
      />
      {{ t('discovery.map.searchAsMove') }}
    </label>
  </div>
</template>
