<template>
  <div v-if="variant === 'card'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <div v-for="n in rows" :key="n" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div class="h-40 w-full motion-safe:animate-pulse bg-slate-100"></div>
      <div class="space-y-3 p-5">
        <div class="h-4 w-2/3 motion-safe:animate-pulse rounded bg-slate-100"></div>
        <div class="h-3 w-1/2 motion-safe:animate-pulse rounded bg-slate-100"></div>
        <div class="h-3 w-1/3 motion-safe:animate-pulse rounded bg-slate-100"></div>
      </div>
    </div>
  </div>
  <div v-else class="space-y-3">
    <div v-for="n in rows" :key="n" class="h-4 w-full motion-safe:animate-pulse rounded bg-slate-100"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    variant?: 'card' | 'line'
  }>(),
  {
    rows: 3,
    variant: 'card'
  }
)
</script>
