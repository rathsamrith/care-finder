<template>
  <article class="group cf-card overflow-hidden transition hover:-translate-y-1 hover:shadow-soft-lg">
    <div class="relative h-48 overflow-hidden">
      <img
        :src="promotion.image ?? fallbackImage"
        :alt="promotion.title || t('discovery.promo.defaultTitle')"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0"></div>
      <span
        class="absolute left-4 top-4 inline-flex items-center gap-1 rounded-sm bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent shadow-soft"
      >
        <TagIcon class="size-3.5" />
        {{ t('discovery.promo.specialOffer') }}
      </span>
      <span
        v-if="endLabel"
        class="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-sm bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-soft"
      >
        <ClockIcon class="size-3.5 text-accent" />
        {{ endLabel }}
      </span>
    </div>
    <div class="p-6">
      <h3 class="text-xl font-semibold text-ink">{{ promotion.title || t('discovery.promo.defaultTitle') }}</h3>
      <p
        v-if="promotion.description && promotion.description !== promotion.title"
        class="mt-2 text-sm leading-6 text-slate-600"
      >
        {{ promotion.description }}
      </p>
      <RouterLink
        v-if="promotion.hospital?.name"
        :to="`/hospital/detail?id=${promotion.hospital.id}`"
        class="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-medium text-slate-500 transition hover:text-accent"
      >
        <MapPinIcon class="size-4 shrink-0 text-accent" />
        <span class="truncate">{{ promotion.hospital.name }}</span>
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClockIcon, MapPinIcon, TagIcon } from '@lucide/vue'

export interface PromotionCardItem {
  id: number | string
  image?: string | null
  title?: string
  description?: string
  endDate?: string | null
  hospital?: { id: number | string; name: string } | null
}

const props = defineProps<{
  promotion: PromotionCardItem
  fallbackImage: string
}>()

const { t } = useI18n()

// "Ends ..." freshness label - only shown for offers that still have a
// (non-negative) window left, so an expired promotion that's still visible
// for some other reason doesn't read as "Ends -3 days".
const endLabel = computed(() => {
  if (!props.promotion.endDate) return null
  const end = new Date(props.promotion.endDate)
  if (Number.isNaN(end.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((end.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return null
  if (diffDays === 0) return t('discovery.promo.endsToday')
  if (diffDays === 1) return t('discovery.promo.endsTomorrow')
  if (diffDays <= 6) return t('discovery.promo.endsInDays', { count: diffDays })
  return t('discovery.promo.endsOn', {
    date: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
})
</script>
