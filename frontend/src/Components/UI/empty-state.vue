<template>
  <div class="flex flex-col items-center py-16 text-center">
    <IconChip size="h-14 w-14">
      <component :is="icon" class="size-6" />
    </IconChip>
    <h3 class="mt-4 text-base font-semibold text-ink">{{ title }}</h3>
    <p v-if="message" class="mt-2 max-w-sm text-sm text-slate-600">{{ message }}</p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import IconChip from './icon-chip.vue'

withDefaults(
  defineProps<{
    title: string
    message?: string
    icon?: any
  }>(),
  {
    icon: SearchIcon
  }
)
</script>
