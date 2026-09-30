<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const quickLinks = [
  { label: 'footer.links.home', to: '/landing' },
  { label: 'footer.links.explore', to: '/explore' },
  { label: 'footer.links.nearby', to: '/nearby' },
  { label: 'footer.links.emergency', to: '/emergency-info' },
  { label: 'footer.links.about', to: '/about' },
  { label: 'footer.links.contact', to: '/contact' },
  { label: 'footer.links.login', to: '/login' }
]

const supportItems = [
  'footer.support.trusted',
  'footer.support.compare',
  'footer.support.manage'
]
</script>

<template>
  <footer class="border-t border-slate-200 bg-white/90">
    <div class="cf-shell py-12">
      <div class="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div class="space-y-4">
          <img src="@/assets/logo/care_finder-02.png" :alt="t('footer.logoAlt')" class="h-12 w-auto" />
          <p class="max-w-md text-sm leading-6 text-slate-600">
            {{ t('footer.description') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="item in supportItems"
              :key="item"
              class="rounded-full bg-accent-tint px-3 py-1 text-xs font-medium text-accent-dark"
            >
              {{ t(item) }}
            </span>
          </div>
        </div>

        <div>
          <h3 class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ t('footer.navigation') }}
          </h3>
          <div class="mt-4 flex flex-col gap-3 text-sm text-slate-600">
            <RouterLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="transition hover:text-accent"
            >
              {{ t(link.label) }}
            </RouterLink>
          </div>
        </div>

        <div>
          <h3 class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ t('footer.contact') }}
          </h3>
          <div class="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>BP 511, Street 371, Sangkat Boeung Tumpun, Phnom Penh</p>
            <p class="font-mono">carefinder.team@example.com</p>
            <p>{{ t('footer.hours') }}</p>
          </div>
        </div>
      </div>

      <div
        class="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>{{ t('footer.copyright') }}</p>
        <p class="font-mono text-xs">v2 &middot; redesign</p>
      </div>
    </div>
  </footer>
</template>
