<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { statusIcon, statusTone, translateStatus } from '@/lib/appointment-status'

const props = defineProps<{
  status: string
}>()

const { t } = useI18n()

const tone = computed(() => statusTone[props.status] ?? 'neutral')
const label = computed(() => translateStatus(t, props.status))
const icon = computed(() => statusIcon[props.status])
</script>

<template>
  <Badge :variant="tone" class="h-6 gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold [&>svg]:size-3.5!">
    <component :is="icon" v-if="icon" />
    {{ label }}
  </Badge>
</template>
