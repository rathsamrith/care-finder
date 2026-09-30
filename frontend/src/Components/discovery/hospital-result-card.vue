<template>
  <Card
    :class="['cursor-pointer overflow-hidden py-0 transition hover:-translate-y-1 hover:shadow-soft-lg', selected && 'ring-2 ring-primary']"
    @click="$emit('select', hospital.id)"
  >
    <div class="relative h-40 w-full overflow-hidden">
      <img
        :src="coverImage"
        :alt="t('discovery.hospitalCoverAlt')"
        class="h-full w-full object-cover"
      />
      <button
        type="button"
        class="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-soft transition hover:text-destructive"
        @click.stop="$emit('favorite', hospital.id)"
      >
        <HeartIcon class="size-4" />
      </button>
      <Badge v-if="openState != null" :variant="openState ? 'success' : 'neutral'" class="absolute left-3 top-3">
        {{ openState ? t('discovery.openNow') : t('discovery.closed') }}
      </Badge>
      <span
        v-if="hospital.photo_count"
        class="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white"
      >
        <CameraIcon class="size-3.5" />
        {{ t('discovery.resultCard.photos', { count: hospital.photo_count }) }}
      </span>
    </div>

    <CardContent class="p-5">
      <p v-if="hospital.category?.name" class="text-xs font-semibold uppercase tracking-wide text-primary">
        {{ hospital.category.name }}
      </p>
      <h4 class="text-base font-semibold text-foreground">{{ hospital.name }}</h4>

      <div v-if="hospital.average_rating != null" class="mt-2 flex items-center gap-2">
        <StarRating :model-value="hospital.average_rating" readonly :size="16" />
        <span class="text-sm font-medium text-gold">{{ hospital.average_rating.toFixed(1) }}</span>
        <span v-if="hospital.review_count" class="text-xs text-muted-foreground">{{ t('discovery.resultCard.reviews', { count: hospital.review_count }) }}</span>
      </div>

      <p v-if="hospital.open_time && hospital.close_time" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <ClockIcon class="size-3.5 shrink-0" />
        {{ hospital.open_time }} – {{ hospital.close_time }}
      </p>
      <p v-if="hospital.province" class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPinIcon class="size-3.5 shrink-0" />
        {{ hospital.province }}
        <span v-if="hospital.distanceKm != null" class="font-medium text-foreground">{{ t('discovery.kmAway', { n: hospital.distanceKm.toFixed(1) }) }}</span>
      </p>
      <p v-if="hospital.phone_number" class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <PhoneIcon class="size-3.5 shrink-0" />
        {{ hospital.phone_number }}
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" @click.stop="$emit('details', hospital.id)">{{ t('discovery.resultCard.bookAppointment') }}</Button>
        <DirectionsButton
          v-if="hospital.latitude && hospital.longitude"
          variant="outline"
          :latitude="hospital.latitude"
          :longitude="hospital.longitude"
        />
        <Button variant="link" size="sm" class="ml-auto" @click.stop="$emit('details', hospital.id)">
          <InfoIcon class="size-3.5" />
          {{ t('discovery.resultCard.details') }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CameraIcon, ClockIcon, HeartIcon, InfoIcon, MapPinIcon, PhoneIcon } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import StarRating from '@/components/ui/star-rating/star-rating.vue'
import DirectionsButton from './directions-button.vue'

const PLACEHOLDER_IMAGE = 'https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1'

const props = defineProps<{
  hospital: {
    id: string | number
    name: string
    cover_image?: string
    open_time?: string | null
    close_time?: string | null
    province?: string
    phone_number?: string
    latitude?: string | number
    longitude?: string | number
    average_rating?: number | null
    review_count?: number
    category?: { name: string } | null
    distanceKm?: number
    photo_count?: number
  }
  selected?: boolean
}>()

defineEmits<{
  (e: 'select', id: string | number): void
  (e: 'details', id: string | number): void
  (e: 'favorite', id: string | number): void
}>()

const { t } = useI18n()

const coverImage = computed(() =>
  props.hospital.cover_image && !['No Cover', 'No cover'].includes(props.hospital.cover_image)
    ? props.hospital.cover_image
    : PLACEHOLDER_IMAGE
)

// Open/close hours are naive wall-clock 'HH:mm' strings (hospital's own posted
// hours, not a real timezone-aware instant) - compared directly against the
// viewer's local clock, same convention as the appointment-time handling
// elsewhere in this app. `open === close` is treated as open 24 hours.
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
