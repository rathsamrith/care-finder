<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { mainAppUrl } from '@/lib/tenant'

import { themeVars, type PublicSite, type SiteSection } from './catalog'
import SiteSectionBlock from './site-section-block.vue'

const props = defineProps<{ data: PublicSite }>()
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)

// A section with nothing to show is skipped rather than rendering an empty heading.
const hasContent = (s: SiteSection) => {
  const d = props.data
  switch (s.type) {
    case 'about':
      return Boolean(d.mission || d.vision)
    case 'services':
      return d.services.length > 0
    case 'departments':
      return d.departments.length > 0
    case 'doctors':
      return d.doctors.length > 0
    case 'gallery':
      return d.gallery.length > 0
    case 'promotions':
      return d.promotions.length > 0
    case 'reviews':
      return d.rating.count > 0
    default:
      return true
  }
}

const template = computed(() => props.data.site.template)
const visibleSections = computed(() =>
  props.data.site.sections.filter((s) => s.enabled && s.type !== 'hero' && hasContent(s))
)
const heroEnabled = computed(() => props.data.site.sections.find((s) => s.type === 'hero')?.enabled !== false)
const style = computed(() => themeVars(props.data.site.theme))

const heroTitle = computed(() => props.data.site.heroTitle || props.data.name)
const heroSubtitle = computed(() => props.data.site.heroSubtitle || props.data.category || '')
const heroImage = computed(() => props.data.site.heroImage || props.data.coverImage)
const bookUrl = computed(() => mainAppUrl(`/hospital/detail?id=${props.data.hospitalId}`))

// Per-template surface styles. Everything color/radius related comes from the
// --site-* variables set by themeVars(), so one hospital's theme can never
// leak onto another page.
const cardClass = computed(
  () =>
    ({
      classic: 'border border-slate-200 bg-white shadow-sm',
      minimal: 'border-t border-slate-200 bg-transparent',
      modern: 'border border-slate-100 bg-white shadow-lg',
      bold: 'border-2 bg-white'
    })[template.value]
)
const cardRadius = computed(() => (template.value === 'minimal' ? '0' : 'var(--site-radius)'))

const go = (type: string) => {
  root.value?.querySelector(`#sec-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div ref="root" class="min-h-full bg-slate-50 text-slate-800" :style="style">
    <header
      class="sticky top-0 z-20 border-b backdrop-blur"
      :class="template === 'bold' ? 'border-transparent' : 'border-slate-200 bg-white/90'"
      :style="template === 'bold' ? 'background: var(--site-accent); color: var(--site-on-accent)' : ''"
    >
      <div
        class="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6"
        :class="template === 'minimal' ? 'flex-col sm:flex-col' : 'justify-between'"
      >
        <div class="flex items-center gap-3">
          <img v-if="data.logo" :src="data.logo" :alt="data.name" class="h-10 w-auto max-w-[160px] object-contain" />
          <span class="text-lg font-bold">{{ data.name }}</span>
        </div>
        <nav class="flex flex-wrap items-center gap-1 text-sm font-medium">
          <button
            v-for="s in visibleSections"
            :key="s.type"
            type="button"
            class="px-3 py-1.5 transition hover:opacity-70"
            :style="template === 'modern' ? 'border-radius: 9999px' : 'border-radius: var(--site-radius)'"
            @click="go(s.type)"
          >
            {{ t(`site.nav.${s.type}`) }}
          </button>
          <a
            :href="bookUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-1 px-4 py-2 font-semibold"
            style="background: var(--site-primary); color: var(--site-on-primary); border-radius: var(--site-radius)"
          >
            {{ t('site.book') }}
          </a>
        </nav>
      </div>
    </header>

    <!-- Hero: one block per template family -->
    <section v-if="heroEnabled" id="sec-hero">
      <div
        v-if="template === 'classic'"
        class="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16"
      >
        <div>
          <h1 class="text-3xl font-extrabold leading-tight sm:text-5xl" style="color: var(--site-primary)">{{ heroTitle }}</h1>
          <p v-if="heroSubtitle" class="mt-4 text-lg text-slate-600">{{ heroSubtitle }}</p>
          <a
            :href="bookUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-6 inline-block px-6 py-3 font-semibold"
            style="background: var(--site-accent); color: var(--site-on-accent); border-radius: var(--site-radius)"
          >
            {{ t('site.book') }}
          </a>
        </div>
        <img
          v-if="heroImage"
          :src="heroImage"
          :alt="data.name"
          class="aspect-[4/3] w-full object-cover shadow-lg"
          style="border-radius: var(--site-radius)"
        />
      </div>

      <div v-else-if="template === 'minimal'" class="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 class="text-4xl font-bold sm:text-6xl" style="color: var(--site-primary)">{{ heroTitle }}</h1>
        <p v-if="heroSubtitle" class="mt-5 text-lg text-slate-600">{{ heroSubtitle }}</p>
      </div>

      <div
        v-else-if="template === 'modern'"
        class="relative flex min-h-[420px] items-end bg-slate-900 bg-cover bg-center sm:min-h-[520px]"
        :style="heroImage ? `background-image:url('${heroImage}')` : 'background: var(--site-primary)'"
      >
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div class="relative mx-auto w-full max-w-6xl px-4 pb-12 text-white sm:px-6">
          <h1 class="max-w-3xl text-4xl font-extrabold sm:text-6xl">{{ heroTitle }}</h1>
          <p v-if="heroSubtitle" class="mt-3 max-w-2xl text-lg text-white/85">{{ heroSubtitle }}</p>
          <a
            :href="bookUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-6 inline-block rounded-full px-7 py-3 font-semibold"
            style="background: var(--site-accent); color: var(--site-on-accent)"
          >
            {{ t('site.book') }}
          </a>
        </div>
      </div>

      <div v-else style="background: var(--site-primary); color: var(--site-on-primary)">
        <div class="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-5 md:py-20">
          <div class="md:col-span-3">
            <h1 class="text-4xl font-black uppercase leading-none sm:text-6xl">{{ heroTitle }}</h1>
            <p v-if="heroSubtitle" class="mt-4 text-lg opacity-90">{{ heroSubtitle }}</p>
            <a
              :href="bookUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-6 inline-block px-7 py-3 font-bold"
              style="background: var(--site-accent); color: var(--site-on-accent); border-radius: var(--site-radius)"
            >
              {{ t('site.book') }}
            </a>
          </div>
          <img
            v-if="heroImage"
            :src="heroImage"
            :alt="data.name"
            class="aspect-square w-full object-cover md:col-span-2"
            style="border-radius: var(--site-radius); border: 4px solid var(--site-accent)"
          />
        </div>
      </div>
    </section>

    <div>
      <SiteSectionBlock
        v-for="(s, i) in visibleSections"
        :id="`sec-${s.type}`"
        :key="s.type"
        :data="data"
        :section="s"
        :card-class="cardClass"
        :class="template === 'bold' && i % 2 === 1 ? 'bg-white' : ''"
        :card-radius="cardRadius"
      />
    </div>

    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p>© {{ new Date().getFullYear() }} {{ data.name }}</p>
      <p class="mt-1">{{ t('site.poweredBy') }}</p>
    </footer>
  </div>
</template>
