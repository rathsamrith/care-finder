<script setup lang="ts">
import { StarIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: number
    max?: number
    readonly?: boolean
    size?: number
    class?: string
  }>(),
  {
    max: 5,
    readonly: false,
    size: 20
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const setRating = (value: number) => {
  if (props.readonly) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div :class="cn('flex items-center gap-1', props.class)">
    <button
      v-for="star in max"
      :key="star"
      type="button"
      :disabled="readonly"
      :class="cn('transition-colors', readonly ? 'cursor-default' : 'cursor-pointer')"
      :aria-label="`${star} star${star === 1 ? '' : 's'}`"
      @click="setRating(star)"
    >
      <StarIcon
        :size="size"
        :class="star <= modelValue ? 'fill-gold text-gold' : 'fill-transparent text-muted-foreground'"
      />
    </button>
  </div>
</template>
