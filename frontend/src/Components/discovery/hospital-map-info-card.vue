<template>
  <Card class="overflow-hidden py-0 shadow-soft-lg">
    <CardContent class="flex items-center gap-3 p-3">
      <img :src="coverImage" :alt="t('discovery.hospitalCoverAlt')" class="size-16 shrink-0 rounded-lg object-cover" />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h5 class="truncate text-sm font-semibold text-foreground">{{ hospital.name }}</h5>
          <Badge v-if="openState != null" :variant="openState ? 'success' : 'neutral'" class="shrink-0">
            {{ openState ? t('discovery.open') : t('discovery.closed') }}
          </Badge>
        </div>
        <p class="mt-1 truncate text-xs text-muted-foreground">
          {{ hospital.province }}
          <span v-if="hospital.distanceKm != null" class="font-medium text-foreground">{{ t('discovery.kmAway', { n: hospital.distanceKm.toFixed(1) }) }}</span>
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Button v-if="hospital.phone_number" size="sm" variant="destructive" @click="callHospital">
            <PhoneIcon class="size-3.5" />
            {{ t('discovery.mapInfo.emergencyCall') }}
          </Button>
          <DirectionsButton
            v-if="hospital.latitude && hospital.longitude"
            variant="outline"
            :latitude="hospital.latitude"
            :longitude="hospital.longitude"
          />
        </div>
      </div>

      <button
        type="button"
        class="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        @click="$emit('close')"
      >
        <XIcon class="size-4" />
      </button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneIcon, XIcon } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DirectionsButton from './directions-button.vue'

const PLACEHOLDER_IMAGE = 'https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1'

const props = defineProps<{
  hospital: {
    id: string | number
    name: string
    cover_image?: string
    phone_number?: string
    open_time?: string | null
    close_time?: string | null
    province?: string
    latitude?: string | number
    longitude?: string | number
    distanceKm?: number
  }
}>()

defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()

function callHospital() {
  if (props.hospital.phone_number) window.location.href = `tel:${props.hospital.phone_number}`
}

const coverImage = computed(() =>
  props.hospital.cover_image && !['No Cover', 'No cover'].includes(props.hospital.cover_image)
    ? props.hospital.cover_image
    : PLACEHOLDER_IMAGE
)

// Same naive wall-clock 'HH:mm' open/close comparison used by
// hospital-result-card.vue - hospital's own posted hours, not
// timezone-aware.
const openState = computed<boolean | null>(() => {
  const { open_time, close_time } = props.hospital
  if (!open_time || !close_time) return null
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const open = toMinutes(open_time)
  const close = toMinutes(close_time)
  if (close <= open) return nowMinutes >= open || nowMinutes < close
  return nowMinutes >= open && nowMinutes < close
})
</script>
