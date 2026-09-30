<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-slate-600">
      <span class="font-mono font-semibold text-ink">{{ count }}</span>
      {{ t('discovery.toolbar.hospitalsFound', count) }}
    </p>
    <div class="flex items-center gap-3">
      <Select :model-value="sortBy" @update:model-value="(v) => $emit('update:sortBy', String(v))">
        <SelectTrigger class="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
        </SelectContent>
      </Select>
      <div class="flex overflow-hidden rounded-lg border border-border">
        <Button
          :variant="view === 'split' ? 'default' : 'ghost'"
          size="sm"
          class="rounded-none"
          @click="$emit('update:view', 'split')"
        >
          <ColumnsIcon class="size-3.5" />
          {{ t('discovery.toolbar.split') }}
        </Button>
        <Button
          :variant="view === 'list' ? 'default' : 'ghost'"
          size="sm"
          class="rounded-none"
          @click="$emit('update:view', 'list')"
        >
          <ListIcon class="size-3.5" />
          {{ t('discovery.toolbar.list') }}
        </Button>
        <Button
          :variant="view === 'map' ? 'default' : 'ghost'"
          size="sm"
          class="rounded-none"
          @click="$emit('update:view', 'map')"
        >
          <MapIcon class="size-3.5" />
          {{ t('discovery.toolbar.map') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ColumnsIcon, ListIcon, MapIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

withDefaults(
  defineProps<{
    count: number
    sortBy: string
    sortOptions: { value: string; label: string }[]
    view: 'split' | 'list' | 'map'
  }>(),
  {}
)

defineEmits<{
  (e: 'update:sortBy', value: string): void
  (e: 'update:view', value: 'split' | 'list' | 'map'): void
}>()
</script>
