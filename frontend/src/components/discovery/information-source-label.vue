<template>
  <p class="text-xs text-slate-500">{{ t('discovery.source', { source }) }}</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  source: string
}>()

const { t } = useI18n()
</script>
