<template>
  <Badge :variant="status === 'verified' ? 'success' : 'neutral'">
    <component :is="status === 'verified' ? CheckCircle2Icon : HelpCircleIcon" class="size-3" />
    {{ status === 'verified' ? t('discovery.verified') : t('discovery.unverified') }}
  </Badge>
</template>

<script setup lang="ts">
import { CheckCircle2Icon, HelpCircleIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'

defineProps<{
  status: 'verified' | 'unverified'
}>()

const { t } = useI18n()
</script>
