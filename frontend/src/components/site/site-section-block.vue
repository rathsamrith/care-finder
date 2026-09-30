<script setup lang="ts">
import { StarIcon, PhoneIcon, ClockIcon, MapPinIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PublicSite, SiteSection } from './catalog'

const props = defineProps<{ data: PublicSite; section: SiteSection; cardClass: string; cardRadius: string }>()
const { t } = useI18n()

const cardStyle = computed(() => ({ borderRadius: props.cardRadius }))
const title = computed(() => props.section.title || t(`site.sections.${props.section.type}`))
const hhmm = (v: string | null) => (v ? String(v).slice(11, 16) : '')
const hours = computed(() =>
  props.data.openTime && props.data.closeTime
    ? `${hhmm(props.data.openTime)} - ${hhmm(props.data.closeTime)}`
    : ''
)
const addressLine = computed(() =>
  [
    props.data.address.street,
    props.data.address.village,
    props.data.address.commune,
    props.data.address.district,
    props.data.address.province
  ]
    .filter(Boolean)
    .join(', ')
)
const directionsUrl = computed(() =>
  props.data.address.latitude && props.data.address.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${props.data.address.latitude},${props.data.address.longitude}`
    : ''
)
const formatDate = (d: string) => new Date(d).toLocaleDateString()
</script>

<template>
  <section class="py-12 sm:py-16">
    <div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <h2 class="text-2xl font-bold sm:text-3xl" style="color: var(--site-primary)">{{ title }}</h2>
      <p v-if="section.subtitle" class="mt-2 max-w-2xl text-slate-600">{{ section.subtitle }}</p>

      <div v-if="section.type === 'about'" class="mt-6 grid gap-6 md:grid-cols-2">
        <div v-if="data.mission" :class="cardClass" :style="cardStyle" class="p-6">
          <h3 class="font-semibold" style="color: var(--site-accent)">{{ t('site.mission') }}</h3>
          <p class="mt-2 whitespace-pre-line text-slate-700">{{ data.mission }}</p>
        </div>
        <div v-if="data.vision" :class="cardClass" :style="cardStyle" class="p-6">
          <h3 class="font-semibold" style="color: var(--site-accent)">{{ t('site.vision') }}</h3>
          <p class="mt-2 whitespace-pre-line text-slate-700">{{ data.vision }}</p>
        </div>
      </div>

      <div v-else-if="section.type === 'services'" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="s in data.services" :key="s.id" :class="cardClass" :style="cardStyle" class="overflow-hidden">
          <img v-if="s.image" :src="s.image" :alt="s.name" class="h-40 w-full object-cover" loading="lazy" />
          <div class="p-5">
            <h3 class="font-semibold text-slate-900">{{ s.name }}</h3>
            <p v-if="s.description" class="mt-2 text-sm text-slate-600">{{ s.description }}</p>
          </div>
        </article>
      </div>

      <div v-else-if="section.type === 'departments'" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="d in data.departments" :key="d.id" :class="cardClass" :style="cardStyle" class="overflow-hidden">
          <img v-if="d.image" :src="d.image" :alt="d.name" class="h-40 w-full object-cover" loading="lazy" />
          <div class="p-5">
            <h3 class="font-semibold text-slate-900">{{ d.name }}</h3>
            <p v-if="d.details" class="mt-2 text-sm text-slate-600">{{ d.details }}</p>
          </div>
        </article>
      </div>

      <div v-else-if="section.type === 'doctors'" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="d in data.doctors" :key="d.id" :class="cardClass" :style="cardStyle" class="p-5 text-center">
          <img
            v-if="d.profile && d.profile !== 'No profile'"
            :src="d.profile"
            :alt="d.name"
            class="mx-auto size-24 rounded-full object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="mx-auto flex size-24 items-center justify-center rounded-full text-2xl font-bold"
            style="background: var(--site-primary); color: var(--site-on-primary)"
          >
            {{ d.name.slice(0, 1) }}
          </div>
          <h3 class="mt-3 font-semibold text-slate-900">{{ d.name }}</h3>
        </article>
      </div>

      <div v-else-if="section.type === 'gallery'" class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <img
          v-for="g in data.gallery"
          :key="g.id"
          :src="g.url ?? ''"
          :alt="t('site.galleryAlt', { name: data.name })"
          class="aspect-square w-full object-cover"
          style="border-radius: var(--site-radius)"
          loading="lazy"
        />
      </div>

      <div v-else-if="section.type === 'promotions'" class="mt-6 grid gap-5 md:grid-cols-2">
        <article v-for="p in data.promotions" :key="p.id" :class="cardClass" :style="cardStyle" class="overflow-hidden">
          <img v-if="p.image" :src="p.image" :alt="p.title" class="h-44 w-full object-cover" loading="lazy" />
          <div class="p-5">
            <h3 class="font-semibold text-slate-900">{{ p.title }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ p.description }}</p>
            <p class="mt-3 text-xs font-semibold" style="color: var(--site-accent)">
              {{ t('site.validUntil', { date: formatDate(p.endDate) }) }}
            </p>
          </div>
        </article>
      </div>

      <div v-else-if="section.type === 'reviews'" class="mt-6">
        <p class="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <StarIcon class="size-4" style="color: var(--site-accent)" fill="currentColor" />
          <strong>{{ data.rating.average.toFixed(1) }}</strong>
          · {{ t('site.reviewCount', { count: data.rating.count }) }}
        </p>
        <div v-if="data.reviews.length" class="grid gap-5 md:grid-cols-2">
          <article v-for="r in data.reviews" :key="r.id" :class="cardClass" :style="cardStyle" class="p-5">
            <div class="flex items-center gap-1" style="color: var(--site-accent)">
              <StarIcon v-for="n in 5" :key="n" class="size-4" :fill="n <= r.star ? 'currentColor' : 'none'" />
            </div>
            <p class="mt-2 text-sm text-slate-700">{{ r.content }}</p>
            <p class="mt-3 text-xs font-semibold text-slate-500">{{ r.author }}</p>
          </article>
        </div>
        <p v-else class="text-slate-500">{{ t('site.noReviews') }}</p>
      </div>

      <div v-else-if="section.type === 'contact'" class="mt-6 grid gap-5 md:grid-cols-3">
        <div v-if="data.phoneNumber" :class="cardClass" :style="cardStyle" class="flex gap-3 p-5">
          <PhoneIcon class="mt-0.5 size-5 shrink-0" style="color: var(--site-primary)" />
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">{{ t('site.phone') }}</p>
            <a :href="`tel:${data.phoneNumber}`" class="font-medium text-slate-900">{{ data.phoneNumber }}</a>
          </div>
        </div>
        <div v-if="hours" :class="cardClass" :style="cardStyle" class="flex gap-3 p-5">
          <ClockIcon class="mt-0.5 size-5 shrink-0" style="color: var(--site-primary)" />
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">{{ t('site.hours') }}</p>
            <p class="font-medium text-slate-900">{{ hours }}</p>
          </div>
        </div>
        <div v-if="addressLine" :class="cardClass" :style="cardStyle" class="flex gap-3 p-5">
          <MapPinIcon class="mt-0.5 size-5 shrink-0" style="color: var(--site-primary)" />
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">{{ t('site.address') }}</p>
            <p class="font-medium text-slate-900">{{ addressLine }}</p>
            <a
              v-if="directionsUrl"
              :href="directionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-sm font-semibold underline"
              style="color: var(--site-primary)"
            >
              {{ t('site.getDirections') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
