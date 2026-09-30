<template>
  <WebLayout>
    <section class="overflow-hidden rounded-[1.25rem] bg-emergency px-6 py-10 text-white shadow-soft sm:px-10">
      <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white/70">{{ t('discovery.emergency.kicker') }}</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{{ t('discovery.emergency.title') }}</h1>
      <p class="mt-4 max-w-2xl text-sm leading-6 text-white/90">
        {{ t('discovery.emergency.intro') }}
      </p>
    </section>

    <section class="mt-10">
      <SectionHeading :kicker="t('discovery.emergency.country')">
        <template #title>{{ t('discovery.emergency.contactsTitle') }}</template>
      </SectionHeading>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        <Card v-for="line in emergencyLines" :key="line.labelKey" padding="p-6" class="text-center">
          <IconChip class="mx-auto" size="h-12 w-12">
            <PhoneIcon class="size-5" />
          </IconChip>
          <h4 class="mt-4 text-sm font-semibold text-ink">{{ t(line.labelKey) }}</h4>
          <a :href="`tel:${line.number}`" class="mt-2 block font-mono text-2xl font-semibold text-emergency">
            {{ line.number }}
          </a>
        </Card>
      </div>
      <p class="mt-4 text-xs text-slate-500">
        {{ t('discovery.emergency.disclaimer') }}
      </p>
    </section>

    <section class="mt-10 overflow-hidden rounded-[1.25rem] bg-navy px-6 py-10 text-center text-white shadow-soft sm:px-10">
      <h3 class="text-2xl font-semibold tracking-tight">{{ t('discovery.emergency.ctaTitle') }}</h3>
      <p class="mt-3 text-sm text-white/80">
        {{ t('discovery.emergency.ctaText') }}
      </p>
      <div class="mt-6">
        <UiButton variant="inverted" :to="{ path: '/nearby' }">{{ t('discovery.emergency.ctaButton') }}</UiButton>
      </div>
    </section>
  </WebLayout>
</template>

<script setup lang="ts">
import { PhoneIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'

const { t } = useI18n()

const emergencyLines = [
  { labelKey: 'discovery.emergency.police', number: '117' },
  { labelKey: 'discovery.emergency.fire', number: '118' },
  { labelKey: 'discovery.emergency.ambulance', number: '119' }
]
</script>
