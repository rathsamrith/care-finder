<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { changeLocale, SUPPORTED_LOCALES } from '@/i18n'

const { locale, t } = useI18n()
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-slate-200 p-0.5 text-xs font-semibold"
    role="group"
    :aria-label="t('language.label')"
  >
    <button
      v-for="code in SUPPORTED_LOCALES"
      :key="code"
      type="button"
      class="rounded-full px-3 py-1.5 transition"
      :class="locale === code ? 'bg-accent text-white' : 'text-slate-600 hover:text-accent'"
      :aria-pressed="locale === code"
      @click="changeLocale(code)"
    >
      {{ t(`language.${code}`) }}
    </button>
  </div>
</template>
