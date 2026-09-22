<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import LanguageSwitcher from '@/components/language-switcher.vue'
import type { PublicSite } from '@/components/site/catalog'
import SiteRenderer from '@/components/site/site-renderer.vue'
import { mainAppUrl, tenant } from '@/lib/tenant'
import axiosInstance from '@/plugins/axios'

const { t } = useI18n()
const data = ref<PublicSite | null>(null)
const state = ref<'loading' | 'ready' | 'missing'>('loading')

const originalTitle = document.title
const setMeta = (name: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

onMounted(async () => {
  try {
    const res = await axiosInstance.get<PublicSite>(`/sites/${tenant}`)
    data.value = res.data
    state.value = 'ready'

    const { site, name, logo } = res.data
    document.title = site.seoTitle || name
    setMeta('description', site.seoDescription || site.heroSubtitle || name)
    if (logo) {
      const icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (icon) icon.href = logo
    }
  } catch {
    state.value = 'missing'
  }
})

onUnmounted(() => {
  document.title = originalTitle
})
</script>

<template>
  <div v-if="state === 'loading'" class="flex min-h-screen items-center justify-center text-slate-500">
    {{ t('site.loading') }}
  </div>

  <div v-else-if="state === 'missing'" class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 class="text-2xl font-bold text-slate-900">{{ t('site.notFoundTitle') }}</h1>
    <p class="max-w-md text-slate-600">{{ t('site.notFoundBody') }}</p>
    <a
      :href="mainAppUrl('/landing')"
      class="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-dark"
    >
      {{ t('site.backToCareFinder') }}
    </a>
    <LanguageSwitcher />
  </div>

  <template v-else-if="data">
    <SiteRenderer :data="data" />
    <div class="fixed bottom-4 right-4 z-30 rounded-full bg-white/95 shadow-lg">
      <LanguageSwitcher />
    </div>
  </template>
</template>
