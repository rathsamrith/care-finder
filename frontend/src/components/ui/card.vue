<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'default' | 'muted' | 'hero'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    padding?: string
  }>(),
  {
    variant: 'default',
    padding: 'p-6'
  }
)

const variantClasses: Record<Variant, string> = {
  default: 'cf-card',
  muted: 'rounded-3xl bg-slate-50',
  hero: 'overflow-hidden rounded-[1.25rem] bg-white shadow-soft'
}

const classes = computed(() => [variantClasses[props.variant], props.padding])
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
