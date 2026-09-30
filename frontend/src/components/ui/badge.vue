<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'accent' | 'gold' | 'danger' | 'success' | 'info' | 'warning' | 'neutral'

const props = withDefaults(
  defineProps<{
    tone?: Tone
  }>(),
  {
    tone: 'accent'
  }
)

const toneClasses: Record<Tone, string> = {
  accent: 'bg-accent-tint text-accent border border-accent/30',
  gold: 'bg-gold-tint text-gold',
  danger: 'bg-danger-light text-danger border border-danger/30',
  success: 'bg-success-light text-success border border-success/30',
  info: 'bg-info-light text-info border border-info/30',
  warning: 'bg-warning-light text-warning border border-warning/30',
  neutral: 'bg-slate-100 text-slate-600'
}

// Status chip: small corners, uppercase bold, paired with a tinted
// background + matching text + subtle border (never color alone).
const classes = computed(
  () => `inline-flex items-center rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneClasses[props.tone]}`
)
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
