<template>
  <p class="text-xs text-slate-500">{{ t('discovery.lastUpdated', { date: formatted }) }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  date: string | Date
}>()

const { t } = useI18n()

const formatted = computed(() =>
  new Date(props.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
)
</script>
