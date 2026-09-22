<template>
  <Select :model-value="modelValue" @update:model-value="(v) => $emit('update:modelValue', String(v))">
    <SelectTrigger class="w-full sm:w-48">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="country in countries" :key="country" :value="country">{{ country }}</SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

withDefaults(
  defineProps<{
    modelValue: string
    countries?: string[]
  }>(),
  {
    countries: () => ['Cambodia']
  }
)

defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
