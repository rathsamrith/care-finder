<script setup lang="ts">
import {
  AmbulanceIcon,
  BadgeCheckIcon,
  Building2Icon,
  CheckIcon,
  HospitalIcon,
  LifeBuoyIcon,
  MapPinIcon,
  SearchIcon,
  StarIcon,
  StethoscopeIcon,
  UserIcon
} from '@lucide/vue'
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import WebLayout from '@/components/layouts/web-layout.vue'
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import PromotionCard, { type PromotionCardItem } from '@/components/discovery/promotion-card.vue'
import heroImage from '@/assets/doctors/doctor-2.png'
import hospitalFallbackImage from '@/assets/image/hospital1.png'
import supportImage from '@/assets/image/contact.png'
import { FeedbackList } from '@/stores/feedback-list'
import axiosInstance from '@/plugins/axios'

// Public landing page - unauthenticated visitors hit this, so promotions
// come straight from `/hospital-promotions/public` (the only unauthenticated
// route on this resource) rather than `promotionStore`, which is
// hospital-owner-scoped and 400s without a logged-in hospital/admin user
// (see the same tradeoff documented in HospitalDiscount.vue).
const UPLOAD_BASE_URL = 'http://127.0.0.1:3001/uploads'

type PromotionItem = PromotionCardItem

type FeaturedHospital = {
  total_star: number | string
  hospital: {
    id: number | string
    name: string
    province: string
    open_time: string
    close_time: string
    cover_image?: string
  }
}

const feedbackStore = FeedbackList()
const router = useRouter()
const { t } = useI18n()

const searchQuery = ref('')

const submitSearch = () => {
  void router.push('/login')
}

const stats = [
  { label: 'home.stats.patients', value: '172K+' },
  { label: 'home.stats.hospitals', value: '300+' },
  { label: 'home.stats.feedbacks', value: '512+' }
]

const highlights = [
  {
    title: 'home.highlights.findFaster.title',
    description: 'home.highlights.findFaster.description',
    icon: SearchIcon
  },
  {
    title: 'home.highlights.compare.title',
    description: 'home.highlights.compare.description',
    icon: StarIcon
  },
  {
    title: 'home.highlights.organized.title',
    description: 'home.highlights.organized.description',
    icon: CheckIcon
  }
]

const steps = [
  {
    title: 'home.steps.search.title',
    description: 'home.steps.search.description',
    icon: SearchIcon
  },
  {
    title: 'home.steps.review.title',
    description: 'home.steps.review.description',
    icon: LifeBuoyIcon
  },
  {
    title: 'home.steps.book.title',
    description: 'home.steps.book.description',
    icon: UserIcon
  }
]

const featuredHospitals = computed<FeaturedHospital[]>(() =>
  // Skip rows without a hospital so one bad/deleted row can't break the whole page.
  (feedbackStore.mostRated as FeaturedHospital[]).filter((item) => item?.hospital).slice(0, 3)
)

// Facility-type navigation, homepage-wide (hero quick-links + Care Nearby).
// Driven by whatever categories actually exist in the database - never a
// hardcoded facility-type list - plus one static Emergency entry, which
// links out rather than claiming a fabricated count.
type CategoryItem = { id: string | number; name: string; description?: string | null }
const hospitals = ref<{ category?: { name?: string } | null }[]>([])
const categories = ref<CategoryItem[]>([])

const CATEGORY_ICON_MAP: Record<string, Component> = {
  'General Hospital': HospitalIcon,
  Clinic: StethoscopeIcon
}
const DEFAULT_CATEGORY_ICON = Building2Icon

const categoryCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const hospital of hospitals.value) {
    const name = hospital.category?.name
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
})

const facilityTypes = computed(() => [
  ...categories.value.map((category) => ({
    key: `category:${category.name}`,
    label: category.name,
    icon: CATEGORY_ICON_MAP[category.name] ?? DEFAULT_CATEGORY_ICON,
    count: categoryCounts.value.get(category.name) ?? 0,
    to: { path: '/explore', query: { category: category.name } }
  })),
  {
    key: 'emergency',
    label: t('home.emergency'),
    icon: AmbulanceIcon,
    count: null as number | null,
    to: '/emergency-info'
  }
])

async function fetchFacilityData() {
  try {
    const [{ data: hospitalData }, { data: categoryData }] = await Promise.all([
      axiosInstance.get('/hospitals/list'),
      axiosInstance.get('/categories/list')
    ])
    hospitals.value = hospitalData ?? []
    categories.value = categoryData ?? []
  } catch (error) {
    console.log(error)
  }
}

const promotions = ref<PromotionItem[]>([])
const featuredPromotions = computed(() => promotions.value.slice(0, 3))

async function fetchPublicPromotions() {
  try {
    const { data } = await axiosInstance.get('/hospital-promotions/public')
    promotions.value = (data as PromotionItem[]).map((item) => ({
      ...item,
      image: item.image ? `${UPLOAD_BASE_URL}/${item.image}` : null
    }))
  } catch (error) {
    console.log(error)
  }
}

onMounted(() => {
  void feedbackStore.fetchMostRated()
  void fetchPublicPromotions()
  void fetchFacilityData()
})
</script>

<template>
  <WebLayout>
    <section
      class="overflow-hidden rounded-[1.25rem] bg-white px-6 py-10 shadow-soft sm:px-10 lg:px-12 lg:py-14"
    >
      <div class="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-6">
          <span
            class="inline-flex font-mono rounded-full bg-accent-tint px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-accent-dark"
          >
            {{ t('home.badge') }}
          </span>
          <div class="space-y-4">
            <h1 class="max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {{ t('home.heroTitle') }}
            </h1>
            <p class="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {{ t('home.heroSubtitle') }}
            </p>
          </div>

          <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="submitSearch">
            <div
              class="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3"
            >
              <SearchIcon class="size-[18px] text-slate-400" />
              <input
                id="home-search"
                v-model="searchQuery"
                type="text"
                :placeholder="t('home.searchPlaceholder')"
                :aria-label="t('home.searchAria')"
                class="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              {{ t('home.search') }}
            </button>
          </form>

          <div class="flex flex-wrap gap-2">
            <RouterLink
              v-for="type in facilityTypes"
              :key="type.key"
              :to="type.to"
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-dark"
            >
              <component :is="type.icon" class="size-4 text-accent-deep" />
              {{ type.label }}
            </RouterLink>
          </div>

          <RouterLink
            to="/about"
            class="inline-flex items-center text-sm font-semibold text-accent transition hover:text-accent-dark"
          >
            {{ t('home.learnMore') }}
          </RouterLink>

          <div class="flex flex-wrap gap-x-8 gap-y-4 rounded-3xl bg-slate-50 px-6 py-5 sm:divide-x sm:divide-slate-200">
            <div v-for="item in stats" :key="item.label" class="sm:pl-8 sm:first:pl-0">
              <p class="font-mono text-2xl font-semibold text-ink">{{ item.value }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ t(item.label) }}</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div
            class="absolute inset-x-10 top-10 h-40 rounded-full bg-accent/15 blur-3xl sm:inset-x-16"
          ></div>
          <div class="relative rounded-[1.25rem] bg-slate-50 px-4 pt-8">
            <img :src="heroImage" :alt="t('home.heroImageAlt')" class="mx-auto max-h-[460px] w-auto" />
          </div>

          <div
            class="absolute -top-4 right-2 z-10 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-4 shadow-soft-lg sm:right-6"
          >
            <AvatarGroup>
              <Avatar size="sm">
                <AvatarFallback class="bg-accent-tint font-semibold text-accent-dark">PH</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback class="bg-secondary-tint font-semibold text-secondary-dark">CF</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback class="bg-gold-tint font-semibold text-gold">MD</AvatarFallback>
              </Avatar>
            </AvatarGroup>
            <div class="flex items-center gap-1.5">
              <div class="leading-tight">
                <p class="font-mono text-sm font-bold text-ink">{{ stats[0].value }}</p>
                <p class="text-[11px] text-slate-500">{{ t(stats[0].label) }}</p>
              </div>
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <BadgeCheckIcon class="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-10 grid gap-6 lg:grid-cols-3">
      <article v-for="item in highlights" :key="item.title" class="cf-card p-6">
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-tint text-accent-deep"
        >
          <component :is="item.icon" class="size-[22px]" />
        </div>
        <h2 class="text-xl font-semibold text-ink">{{ t(item.title) }}</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">{{ t(item.description) }}</p>
      </article>
    </section>

    <section class="mt-10">
      <span class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
        {{ t('home.careNearby.kicker') }}
      </span>
      <h2 class="mt-2 text-2xl font-semibold tracking-tight text-ink">{{ t('home.careNearby.title') }}</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="type in facilityTypes"
          :key="type.key"
          :to="type.to"
          class="cf-card flex items-center gap-4 p-6 transition hover:-translate-y-1 hover:shadow-soft-lg"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            :class="type.key === 'emergency' ? 'bg-emergency-light text-emergency' : 'bg-accent-tint text-accent-deep'"
          >
            <component :is="type.icon" class="size-5" />
          </div>
          <div>
            <p class="text-base font-semibold text-ink">{{ type.label }}</p>
            <p class="mt-1 text-sm text-slate-500">
              {{ type.count === null ? t('home.careNearby.callNumber') : t('home.careNearby.available', { count: type.count }) }}
            </p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="mt-10">
      <span class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {{ t('home.browse.kicker') }}
      </span>
      <h2 class="mt-2 text-2xl font-semibold tracking-tight text-ink">{{ t('home.browse.title') }}</h2>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          :to="{ path: '/explore', query: { category: category.name } }"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent-dark"
        >
          <component :is="CATEGORY_ICON_MAP[category.name] ?? DEFAULT_CATEGORY_ICON" class="size-4 text-accent-deep" />
          {{ category.name }}
        </RouterLink>
        <RouterLink
          to="/explore"
          class="inline-flex items-center px-2 text-sm font-semibold text-accent hover:text-accent-dark"
        >
          {{ t('home.browse.viewAll') }}
        </RouterLink>
      </div>
    </section>

    <section class="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div class="cf-card overflow-hidden">
        <img :src="supportImage" :alt="t('home.supportImageAlt')" class="h-full w-full object-cover" />
      </div>

      <div class="cf-card p-8 sm:p-10">
        <div class="max-w-xl">
          <span class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ t('home.howItWorks.kicker') }}
          </span>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {{ t('home.howItWorks.title') }}
          </h2>
          <div class="mt-8 space-y-6">
            <div v-for="(item, index) in steps" :key="item.title" class="flex gap-4">
              <div
                class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent-tint text-accent-deep"
              >
                <component :is="item.icon" class="size-5" />
              </div>
              <div>
                <p class="font-mono text-xs font-semibold text-accent">
                  0{{ index + 1 }}
                </p>
                <h3 class="text-lg font-semibold text-ink">{{ t(item.title) }}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ t(item.description) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-10">
      <div class="flex items-end justify-between gap-4">
        <div>
          <span class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
            {{ t('home.promotions.kicker') }}
          </span>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {{ t('home.promotions.title') }}
          </h2>
        </div>
        <RouterLink to="/login" class="text-sm font-semibold text-accent hover:text-accent-dark">{{ t('home.promotions.seeMore') }}</RouterLink>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <PromotionCard
          v-for="promotion in featuredPromotions"
          :key="promotion.id"
          :promotion="promotion"
          :fallback-image="hospitalFallbackImage"
        />

        <article
          v-if="!featuredPromotions.length"
          class="cf-card col-span-full flex min-h-52 items-center justify-center p-8 text-center text-slate-500"
        >
          {{ t('home.promotions.empty') }}
        </article>
      </div>
    </section>

    <section class="mt-10 pb-2">
      <div class="flex items-end justify-between gap-4">
        <div>
          <span class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ t('home.topHospitals.kicker') }}
          </span>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {{ t('home.topHospitals.title') }}
          </h2>
        </div>
        <RouterLink to="/" class="text-sm font-semibold text-accent hover:text-accent-dark">{{ t('home.topHospitals.browse') }}</RouterLink>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <article
          v-for="item in featuredHospitals"
          :key="item.hospital.id"
          class="cf-card overflow-hidden transition hover:-translate-y-1 hover:shadow-soft-lg"
        >
          <div class="relative">
            <img
              :src="
                item.hospital.cover_image && item.hospital.cover_image !== 'No cover'
                  ? item.hospital.cover_image
                  : hospitalFallbackImage
              "
              :alt="item.hospital.name"
              class="h-56 w-full object-cover"
            />
            <div
              class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-gold shadow-soft"
            >
              <StarIcon class="size-4" />
              <span class="font-mono">{{ item.total_star }}</span>
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-semibold text-ink">{{ item.hospital.name }}</h3>
            <div class="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <MapPinIcon class="size-4" />
              <span class="font-mono">{{ item.hospital.province }}</span>
            </div>

            <p class="mt-4 text-sm leading-6 text-slate-600">
              {{ t('home.topHospitals.open', { open: item.hospital.open_time, close: item.hospital.close_time }) }}
            </p>
            <RouterLink
              :to="`/hospital/detail?id=${item.hospital.id}`"
              class="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-dark"
            >
              {{ t('home.topHospitals.viewDetails') }}
            </RouterLink>
          </div>
        </article>

        <article
          v-if="!featuredHospitals.length"
          class="cf-card col-span-full flex min-h-52 items-center justify-center p-8 text-center text-slate-500"
        >
          {{ t('home.topHospitals.empty') }}
        </article>
      </div>
    </section>

    <section class="mt-10 rounded-[1.25rem] bg-navy px-6 py-14 text-center sm:px-10">
      <h2 class="text-3xl font-semibold tracking-tight text-white">
        {{ t('home.cta.title') }}
      </h2>
      <p class="mx-auto mt-3 max-w-lg text-base leading-7 text-white/70">
        {{ t('home.cta.subtitle') }}
      </p>
      <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <RouterLink
          to="/login"
          class="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-accent-deep transition hover:bg-gold-tint"
        >
          {{ t('home.cta.createAccount') }}
        </RouterLink>
        <RouterLink
          to="/"
          class="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white"
        >
          {{ t('home.cta.browse') }}
        </RouterLink>
      </div>
    </section>
  </WebLayout>
</template>
