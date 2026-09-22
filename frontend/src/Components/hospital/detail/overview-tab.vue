<template>
  <div class="space-y-10">
    <div v-if="aboutText">
      <SectionHeading :kicker="t('hospitalDetail.overview.aboutKicker')">
        <template #title>{{ t('hospitalDetail.overview.aboutHeading') }}</template>
      </SectionHeading>
      <p class="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{{ aboutText }}</p>
    </div>

    <div>
      <SectionHeading :kicker="t('hospitalDetail.overview.contactKicker')">
        <template #title>{{ t('hospitalDetail.overview.contactHeading') }}</template>
      </SectionHeading>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        <Card padding="p-6" class="text-center">
          <IconChip class="mx-auto">
            <PhoneIcon class="size-5" />
          </IconChip>
          <h4 class="mt-4 text-sm font-semibold text-ink">{{ t('hospitalDetail.overview.callUs') }}</h4>
          <p class="mt-2 text-sm text-slate-600">{{ phoneNumber }}</p>
        </Card>
        <Card padding="p-6" class="text-center">
          <IconChip class="mx-auto">
            <MapPinIcon class="size-5" />
          </IconChip>
          <h4 class="mt-4 text-sm font-semibold text-ink">{{ t('hospitalDetail.overview.findUs') }}</h4>
          <p class="mt-2 text-sm text-slate-600">{{ address || t('hospitalDetail.overview.addressMissing') }}</p>
        </Card>
        <Card padding="p-6" class="text-center">
          <IconChip class="mx-auto">
            <ClockIcon class="size-5" />
          </IconChip>
          <h4 class="mt-4 text-sm font-semibold text-ink">{{ t('hospitalDetail.overview.hours') }}</h4>
          <p class="mt-2 text-sm text-slate-600">{{ hours || t('hospitalDetail.overview.hoursMissing') }}</p>
        </Card>
      </div>
    </div>

    <div v-if="services.length">
      <div class="flex items-center justify-between">
        <SectionHeading :kicker="t('hospitalDetail.overview.servicesKicker')">
          <template #title>{{ t('hospitalDetail.overview.servicesHeading') }}</template>
        </SectionHeading>
        <UiButton variant="subtle" @click="$emit('view-all-services')">{{ t('hospitalDetail.overview.viewAll') }}</UiButton>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card v-for="service in services" :key="service.id" padding="p-0" class="overflow-hidden text-center">
          <img
            v-if="service.image"
            :src="service.image"
            :alt="service.name"
            class="h-24 w-full object-cover"
          />
          <div v-else class="flex h-24 w-full items-center justify-center bg-accent-tint text-accent-deep">
            <LifeBuoyIcon class="size-6" />
          </div>
          <p class="p-3 text-sm font-semibold text-ink">{{ service.name }}</p>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClockIcon, LifeBuoyIcon, MapPinIcon, PhoneIcon } from '@lucide/vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'

const { t } = useI18n()

const props = defineProps<{
  phoneNumber: string
  address?: string
  hours?: string
  mission?: string | null
  vision?: string | null
  categoryDescription?: string | null
  services: { id: number | string; name: string; image: string | null }[]
}>()

defineEmits<{ (e: 'view-all-services'): void }>()

// Real content only - mission/vision if the hospital set them, falling back
// to its category's description, never invented placeholder copy.
const aboutText = computed(() => {
  const parts = [...new Set([props.mission, props.vision].filter(Boolean))]
  if (parts.length) return parts.join('\n\n')
  return props.categoryDescription || ''
})
</script>
