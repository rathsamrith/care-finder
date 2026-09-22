<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('discovery.filters.label') }}</span>

    <button type="button" @click="$emit('update:topRatedOnly', !topRatedOnly)">
      <Badge :variant="topRatedOnly ? 'default' : 'outline'" class="cursor-pointer gap-1.5 px-3 py-1">
        {{ t('discovery.filters.topRated') }}
        <XIcon v-if="topRatedOnly" class="size-3" />
      </Badge>
    </button>

    <button type="button" @click="$emit('update:openNowOnly', !openNowOnly)">
      <Badge :variant="openNowOnly ? 'default' : 'outline'" class="cursor-pointer gap-1.5 px-3 py-1">
        {{ t('discovery.filters.openNow') }}
        <XIcon v-if="openNowOnly" class="size-3" />
      </Badge>
    </button>

    <Popover>
      <PopoverTrigger as-child>
        <button type="button">
          <Badge variant="outline" class="cursor-pointer gap-1.5 px-3 py-1">
            <SlidersHorizontalIcon class="size-3" />
            {{ t('discovery.filters.more') }}
            <span v-if="moreFiltersCount">({{ moreFiltersCount }})</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent class="w-72 space-y-6" align="start">
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('discovery.filters.province') }}</Label>
          <Select
            :model-value="selectedProvinces[0] ?? ALL"
            @update:model-value="(v) => $emit('update:selectedProvinces', v === ALL ? [] : [String(v)])"
          >
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="max-h-64">
              <SelectItem :value="ALL">{{ t('discovery.filters.allProvinces') }}</SelectItem>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>{{ t('discovery.filters.province') }}</SelectLabel>
                <SelectItem v-for="province in provinces" :key="province" :value="province">{{ province }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('discovery.filters.distance') }}</Label>
          <p v-if="!hasOrigin" class="text-xs text-muted-foreground">{{ t('discovery.filters.enableLocation') }}</p>
          <RadioGroup
            :model-value="distanceValue"
            :class="{ 'pointer-events-none opacity-50': !hasOrigin }"
            @update:model-value="(v) => onDistanceChange(String(v))"
          >
            <label v-for="option in DISTANCE_OPTIONS" :key="option.value" class="flex items-center gap-2 text-sm text-foreground">
              <RadioGroupItem :value="option.value" :disabled="!hasOrigin" />
              {{ t('discovery.kmUnit', { n: option.value }) }}
            </label>
            <label class="flex items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value="custom" :disabled="!hasOrigin" />
              {{ t('discovery.filters.custom') }}
            </label>
          </RadioGroup>
          <Input
            v-if="distanceValue === 'custom'"
            type="number"
            min="1"
            :placeholder="t('discovery.filters.maxKm')"
            class="mt-1 w-full"
            :model-value="maxDistanceKm ?? ''"
            :disabled="!hasOrigin"
            @update:model-value="(v) => $emit('update:maxDistanceKm', v === '' ? null : Number(v))"
          />
        </div>
      </PopoverContent>
    </Popover>

    <ActiveFilterChips v-if="chips.length" :chips="chips" @remove="removeChip" @clear="clearAll" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SlidersHorizontalIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import ActiveFilterChips from './active-filter-chips.vue'

const { t } = useI18n()

const ALL = '__all__'
const DISTANCE_OPTIONS = [{ value: '1' }, { value: '5' }, { value: '10' }, { value: '25' }]

const props = defineProps<{
  provinces: string[]
  selectedProvinces: string[]
  maxDistanceKm: number | null
  hasOrigin: boolean
  openNowOnly: boolean
  topRatedOnly: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedProvinces', value: string[]): void
  (e: 'update:maxDistanceKm', value: number | null): void
  (e: 'update:openNowOnly', value: boolean): void
  (e: 'update:topRatedOnly', value: boolean): void
}>()

// The radio group's own value: "any" (no filter), a preset km string, or
// "custom" (reveals the numeric input). Derived from maxDistanceKm rather
// than tracked separately, so there's one source of truth.
const distanceValue = computed(() => {
  if (props.maxDistanceKm == null) return 'any'
  const preset = DISTANCE_OPTIONS.find((o) => Number(o.value) === props.maxDistanceKm)
  return preset ? preset.value : 'custom'
})

function onDistanceChange(v: string) {
  if (v === 'any') {
    emit('update:maxDistanceKm', null)
  } else if (v === 'custom') {
    // Leave maxDistanceKm as-is until the visitor types a number into the
    // custom input - switching to "custom" alone shouldn't apply a filter.
  } else {
    emit('update:maxDistanceKm', Number(v))
  }
}

const moreFiltersCount = computed(
  () => (props.selectedProvinces.length ? 1 : 0) + (props.maxDistanceKm != null ? 1 : 0)
)

const chips = computed(() => [
  ...props.selectedProvinces.map((p) => ({ key: `province:${p}`, label: p })),
  ...(props.maxDistanceKm != null ? [{ key: 'distance', label: t('discovery.filters.within', { n: props.maxDistanceKm }) }] : [])
])

function removeChip(key: string) {
  if (key === 'distance') {
    emit('update:maxDistanceKm', null)
    return
  }
  const [, value] = key.split(':')
  emit(
    'update:selectedProvinces',
    props.selectedProvinces.filter((p) => p !== value)
  )
}

function clearAll() {
  emit('update:selectedProvinces', [])
  emit('update:maxDistanceKm', null)
  emit('update:openNowOnly', false)
  emit('update:topRatedOnly', false)
}
</script>
