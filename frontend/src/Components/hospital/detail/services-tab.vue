<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.services.kicker')">
      <template #title>{{ t('hospitalDetail.services.heading') }}</template>
    </SectionHeading>
    <div v-if="services.length" class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="service in services" :key="service.id" padding="p-0" class="overflow-hidden text-center">
        <img
          v-if="service.image"
          :src="service.image"
          :alt="service.name"
          class="h-36 w-full object-cover"
        />
        <div v-else class="flex h-36 w-full items-center justify-center bg-accent-tint text-accent-deep">
          <LifeBuoyIcon class="size-8" />
        </div>
        <div class="p-4">
          <h6 class="text-sm font-semibold text-ink">{{ service.name }}</h6>
          <p v-if="service.description" class="mt-2 text-sm leading-6 text-slate-600">{{ service.description }}</p>
        </div>
      </Card>
    </div>
    <p v-else class="mt-6 text-sm text-slate-500">{{ t('hospitalDetail.services.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LifeBuoyIcon } from '@lucide/vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'

const { t } = useI18n()

defineProps<{
  services: { id: number | string; name: string; image: string | null; description: string | null }[]
}>()
</script>
