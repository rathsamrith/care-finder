<script setup lang="ts">
import {
  Building2Icon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  GlobeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon
} from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import Badge from '@/components/ui/badge.vue'
import Card from '@/components/ui/card.vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'
import { formatAddress, formatHours, isBlank, isOpenNow, profileCompleteness, type CompletenessKey } from '@/lib/hospital-profile'

// The hospital's own "About" view: who they are at a glance, what is still
// missing from their profile (with a one-click way to fix each thing), and the
// mission and vision as text. Editing itself stays in the parent's dialog.
const props = defineProps<{ hospital: Record<string, any>; serviceCount: number }>()
const emit = defineEmits<{ edit: []; action: [key: CompletenessKey] }>()
const { t } = useI18n()

const hours = computed(() => formatHours(props.hospital.open_time, props.hospital.close_time))
const openNow = computed(() => isOpenNow(props.hospital.open_time, props.hospital.close_time))
const address = computed(() => formatAddress(props.hospital))
const phone = computed(() => (isBlank(props.hospital.phone_number) ? '' : String(props.hospital.phone_number)))
const completeness = computed(() => profileCompleteness(props.hospital, props.serviceCount))
const publicUrl = computed(() => `/hospital/detail?id=${props.hospital.id}`)

// Missing pieces go to the editor, or to the tab where that thing is managed.
const fix = (key: CompletenessKey) => (['phone', 'hours', 'address', 'story'].includes(key) ? emit('edit') : emit('action', key))
</script>

<template>
  <div>
    <!-- Who they are -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-500">{{ t('hospitalProfile.kicker') }}</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight text-ink" data-testid="name">{{ hospital.name }}</h2>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Badge v-if="hospital.category?.name" tone="neutral">{{ hospital.category.name }}</Badge>
          <Badge v-if="openNow !== null" :tone="openNow ? 'success' : 'warning'" data-testid="open-badge">
            {{ openNow ? t('hospitalProfile.openNow') : t('hospitalProfile.closedNow') }}
          </Badge>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton variant="subtle" :to="publicUrl"><ExternalLinkIcon class="size-4" />{{ t('hospitalProfile.viewPublic') }}</UiButton>
        <UiButton variant="subtle" to="/hospital/site"><GlobeIcon class="size-4" />{{ t('hospitalProfile.website') }}</UiButton>
        <UiButton variant="primary" @click="emit('edit')"><PencilIcon class="size-4" />{{ t('hospitalProfile.edit') }}</UiButton>
      </div>
    </div>

    <!-- What is still missing -->
    <Card v-if="!completeness.complete" padding="p-5" class="mt-6" data-testid="completeness">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="font-semibold text-ink">{{ t('hospitalProfile.completeness.title') }}</h3>
          <p class="text-sm text-slate-600">{{ t('hospitalProfile.completeness.progress', { done: completeness.done, total: completeness.total }) }}</p>
        </div>
        <p class="text-2xl font-semibold text-accent-dark" data-testid="percent">{{ completeness.percent }}%</p>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" :aria-valuenow="completeness.percent" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-accent transition-all" :style="{ width: `${completeness.percent}%` }" />
      </div>
      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
        <li v-for="item in completeness.items" :key="item.key" class="flex items-center gap-2 text-sm" :data-done="item.done">
          <CheckCircle2Icon v-if="item.done" class="size-4 shrink-0 text-success" />
          <CircleIcon v-else class="size-4 shrink-0 text-slate-300" />
          <span :class="item.done ? 'text-slate-500' : 'text-ink'">{{ t(`hospitalProfile.completeness.items.${item.key}`) }}</span>
          <button
            v-if="!item.done"
            type="button"
            class="ml-auto text-xs font-semibold text-accent hover:text-accent-dark hover:underline"
            @click="fix(item.key)"
          >
            {{ t(`hospitalProfile.completeness.fix.${item.key}`) }}
          </button>
        </li>
      </ul>
    </Card>

    <!-- The facts -->
    <Card padding="p-6" class="mt-6">
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="flex items-start gap-3">
          <IconChip><ClockIcon class="size-5" /></IconChip>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('hospitalCards.about.workingHours') }}</p>
            <p v-if="hours.kind === 'range'" class="mt-1 font-medium text-ink" data-testid="hours">{{ t('hospitalProfile.hoursRange', { open: hours.open, close: hours.close }) }}</p>
            <p v-else-if="hours.kind === 'from'" class="mt-1 font-medium text-ink" data-testid="hours">{{ t('hospitalProfile.hoursFrom', { open: hours.open }) }}</p>
            <p v-else-if="hours.kind === 'until'" class="mt-1 font-medium text-ink" data-testid="hours">{{ t('hospitalProfile.hoursUntil', { close: hours.close }) }}</p>
            <button v-else type="button" class="mt-1 text-sm font-semibold text-accent hover:underline" @click="emit('edit')">{{ t('hospitalProfile.completeness.fix.hours') }}</button>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <IconChip><PhoneIcon class="size-5" /></IconChip>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('hospitalCards.about.phone') }}</p>
            <a v-if="phone" :href="`tel:${phone}`" class="mt-1 block font-medium text-ink hover:text-accent" data-testid="phone">{{ phone }}</a>
            <button v-else type="button" class="mt-1 text-sm font-semibold text-accent hover:underline" @click="emit('edit')">{{ t('hospitalProfile.completeness.fix.phone') }}</button>
          </div>
        </div>
      </div>
      <div class="mt-6 flex items-start gap-3 border-t border-slate-100 pt-6">
        <IconChip><MapPinIcon class="size-5" /></IconChip>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('hospitalCards.about.address') }}</p>
          <p v-if="address" class="mt-1 font-medium text-ink" data-testid="address">{{ address }}</p>
          <button v-else type="button" class="mt-1 text-sm font-semibold text-accent hover:underline" @click="emit('edit')">{{ t('hospitalProfile.completeness.fix.address') }}</button>
        </div>
      </div>
    </Card>

    <!-- Mission and vision -->
    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <Card v-for="kind in (['mission', 'vision'] as const)" :key="kind" padding="p-6" :data-testid="kind">
        <div class="flex items-center gap-2">
          <Building2Icon class="size-4 text-accent" />
          <h3 class="text-lg font-semibold text-ink">{{ t(`hospitalCards.about.${kind}`) }}</h3>
        </div>
        <p v-if="!isBlank(hospital[kind])" class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{{ hospital[kind] }}</p>
        <div v-else class="mt-3">
          <p class="text-sm text-slate-500">{{ t(kind === 'mission' ? 'hospitalCards.about.noMission' : 'hospitalCards.about.noVision') }}</p>
          <button type="button" class="mt-2 text-sm font-semibold text-accent hover:underline" @click="emit('edit')">{{ t('hospitalProfile.add') }}</button>
        </div>
      </Card>
    </div>
  </div>
</template>
