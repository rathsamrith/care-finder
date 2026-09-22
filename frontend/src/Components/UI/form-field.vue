<script setup lang="ts">
import { computed } from 'vue'

// Label + control + inline error, wired for screen readers: the error is linked
// to the control through aria-describedby (slot prop) and announced via role="alert".
// Usage: <FormField id="x" :label="..." :error="errors.x" v-slot="{ id, describedby, invalid }">
//          <input :id="id" :aria-describedby="describedby" :aria-invalid="invalid" ... />
const props = defineProps<{
  id: string
  label: string
  error?: string
  hint?: string
}>()

const errorId = computed(() => `${props.id}-error`)
const hintId = computed(() => `${props.id}-hint`)
const describedby = computed(() => [props.error ? errorId.value : '', props.hint ? hintId.value : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div>
    <label :for="id" class="text-sm font-semibold text-ink">{{ label }}</label>
    <slot :id="id" :describedby="describedby" :invalid="Boolean(error)" />
    <p v-if="hint && !error" :id="hintId" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
    <p v-if="error" :id="errorId" role="alert" class="mt-1 text-xs font-medium text-danger">{{ error }}</p>
  </div>
</template>
