<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
import UiButton from '@/components/ui/button.vue'
import { SearchIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <WebLayout>
    <section class="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-20">
      <div class="text-center lg:text-left">
        <p class="font-mono text-2xl font-semibold text-accent">404</p>
        <h1 class="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {{ t('notFound.title') }}
        </h1>
        <p class="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
          {{ t('notFound.description') }}
        </p>
        <div class="mt-8 flex justify-center lg:justify-start">
          <UiButton variant="primary" :to="{ path: '/' }">{{ t('notFound.backHome') }}</UiButton>
        </div>
      </div>
      <div class="mx-auto flex h-80 w-80 items-center justify-center rounded-[1.25rem] bg-accent-tint shadow-soft">
        <SearchIcon class="size-24 text-accent-deep" />
      </div>
    </section>
  </WebLayout>
</template>
