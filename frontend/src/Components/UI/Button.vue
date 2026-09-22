<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

type Variant = 'primary' | 'inverted' | 'outline' | 'subtle' | 'link' | 'icon' | 'danger'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    to?: string | Record<string, unknown>
    href?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false
  }
)

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<Variant, string> = {
  primary: `${base} bg-accent px-6 py-2.5 text-sm text-white hover:bg-accent-dark active:bg-accent-deep`,
  inverted: `${base} bg-white px-6 py-2.5 text-sm text-accent-deep hover:bg-gold-tint`,
  outline: `${base} border border-white/40 px-6 py-2.5 text-sm text-white hover:border-white`,
  subtle: `${base} border border-accent px-5 py-2.5 text-sm text-accent hover:bg-accent-tint`,
  link: `${base} min-h-0 text-sm text-accent hover:text-accent-dark`,
  icon: `${base} relative min-h-0 min-w-11 border border-accent p-2 text-accent hover:bg-accent-tint`,
  danger: `${base} bg-danger px-6 py-2.5 text-sm text-white hover:bg-danger-dark`
}

const classes = computed(() => variantClasses[props.variant])
const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :disabled="!to && !href ? disabled : undefined"
    :class="classes"
  >
    <slot />
  </component>
</template>
