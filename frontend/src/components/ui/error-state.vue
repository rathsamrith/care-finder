<template>
  <div class="flex flex-col items-center py-16 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-light text-danger-dark">
      <AlertTriangleIcon class="size-6" />
    </div>
    <h3 class="mt-4 text-base font-semibold text-ink">{{ title }}</h3>
    <p v-if="message" class="mt-2 max-w-sm text-sm text-slate-600">{{ message }}</p>
    <div class="mt-6">
      <UiButton v-if="showRetry" variant="subtle" @click="$emit('retry')">{{ t('ui.tryAgain') }}</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AlertTriangleIcon } from '@lucide/vue'
import UiButton from './button.vue'

const { t } = useI18n()

withDefaults(
  defineProps<{
    title: string
    message?: string
    showRetry?: boolean
  }>(),
  {
    showRetry: true
  }
)

defineEmits<{ (e: 'retry'): void }>()
</script>
