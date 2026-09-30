<template>
  <Card>
    <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
      <div class="flex-1 space-y-1.5">
        <Label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('discovery.searchBar.facility') }}</Label>
        <Select
          :model-value="selectedCategories[0] ?? ALL"
          @update:model-value="(v) => $emit('update:selectedCategories', v === ALL ? [] : [String(v)])"
        >
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">{{ t('discovery.searchBar.allFacilities') }}</SelectItem>
            <SelectSeparator v-if="categories.length" />
            <SelectItem v-for="category in categories" :key="category.id" :value="category.name">
              {{ category.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex-[2] space-y-1.5">
        <Label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('discovery.searchBar.keyword') }}</Label>
        <div class="relative">
          <SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            :model-value="query"
            :placeholder="t('discovery.searchBar.keywordPlaceholder')"
            class="w-full pl-9"
            @update:model-value="(v) => $emit('update:query', String(v))"
            @keyup.enter="$emit('submit')"
          />
        </div>
      </div>

      <Button class="sm:w-auto" @click="$emit('submit')">
        <SearchIcon class="size-4" />
        {{ t('discovery.searchBar.findCare') }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const ALL = '__all__'

const { t } = useI18n()

defineProps<{
  categories: { id: string | number; name: string }[]
  selectedCategories: string[]
  query: string
}>()

defineEmits<{
  (e: 'update:selectedCategories', value: string[]): void
  (e: 'update:query', value: string): void
  (e: 'submit'): void
}>()
</script>
