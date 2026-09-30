<script setup lang="ts">
withDefaults(
  defineProps<{
    kicker?: string
    dark?: boolean
  }>(),
  {
    dark: false
  }
)
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p
        v-if="kicker"
        :class="[
          'font-mono text-xs font-medium uppercase tracking-[0.14em]',
          dark ? 'text-white/70' : 'text-accent-dark'
        ]"
      >
        {{ kicker }}
      </p>
      <h2
        :class="[
          'text-3xl font-semibold tracking-tight',
          dark ? 'text-white' : 'text-ink'
        ]"
      >
        <slot name="title" />
      </h2>
      <p v-if="$slots.subtitle" :class="['mt-1 text-sm leading-6', dark ? 'text-white/70' : 'text-slate-600']">
        <slot name="subtitle" />
      </p>
    </div>
    <div v-if="$slots.action">
      <slot name="action" />
    </div>
  </div>
</template>
