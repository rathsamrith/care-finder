<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: string
  }>(),
  {
    size: 'h-12 w-12'
  }
)
</script>

<template>
  <div :class="`flex ${size} items-center justify-center rounded-2xl bg-accent-tint text-accent-deep`">
    <slot />
  </div>
</template>
