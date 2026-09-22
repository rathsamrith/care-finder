<template>
  <Button :variant="variant" @click="openDirections">
    <NavigationIcon class="size-3.5" />
    {{ t('discovery.getDirections') }}
  </Button>
</template>

<script setup lang="ts">
import { NavigationIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import type { ButtonVariants } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    latitude: number | string
    longitude: number | string
    variant?: ButtonVariants['variant']
  }>(),
  {
    variant: 'outline'
  }
)

const { t } = useI18n()

function openDirections() {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${props.latitude},${props.longitude}`
  window.open(url, '_blank', 'noopener')
}
</script>
