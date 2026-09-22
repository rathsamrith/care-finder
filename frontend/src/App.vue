<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { isPreview } from '@/config/app-mode'
</script>
<template>
  <RouterView />
  <Toaster position="top-right" rich-colors />
  <div
    v-if="isPreview"
    class="pointer-events-none fixed bottom-2 left-2 z-[100] rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow"
  >
    {{ $t('common.previewBanner') }}
  </div>
</template>
