<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.gallery.kicker')">
      <template #title>{{ t('hospitalDetail.gallery.heading') }}</template>
    </SectionHeading>
    <div class="mt-6 h-[480px] overflow-hidden rounded-[1.25rem] shadow-soft">
      <Carousel :count="images.length">
        <CarouselItem v-for="(item, index) in images" :key="index">
          <img :src="item.image" :alt="t('hospitalDetail.gallery.alt')" class="h-full w-full object-cover" />
        </CarouselItem>
      </Carousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Carousel, CarouselItem } from '@/components/ui/carousel'

const { t } = useI18n()

defineProps<{ images: { image: string }[] }>()
</script>
