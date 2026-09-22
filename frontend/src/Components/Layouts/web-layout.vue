<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import FooterLayout from '@/components/footer-layout.vue'
import WebHeaderMenu from '@/components/web-header-menu.vue'

const route = useRoute()

const hideFooterPaths = ['/login', '/forgot-password', '/reset-password']
const showFooter = computed(() => !hideFooterPaths.includes(route.path))
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <WebHeaderMenu />
    <main class="pb-12 pt-6 sm:pt-8">
      <div class="cf-shell">
        <slot />
      </div>
    </main>
    <FooterLayout v-if="showFooter" />
  </div>
</template>
