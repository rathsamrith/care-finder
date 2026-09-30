<template>
  <section v-if="promotions.length > 0" class="mt-10">
    <SectionHeading :kicker="t('hospitals.discount.kicker')">
      <template #title>{{ t('hospitals.discount.title') }}</template>
    </SectionHeading>
    <div class="mt-6 h-[400px] overflow-hidden rounded-[1.25rem] shadow-soft">
      <Carousel :count="promotions.length" autoplay>
        <CarouselItem v-for="item in promotions" :key="item.id">
          <img
            :src="item.image || 'https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1'"
            :alt="t('hospitals.discount.alt')"
            class="h-full w-full object-cover"
          />
        </CarouselItem>
      </Carousel>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Carousel, CarouselItem } from '@/components/ui/carousel'
import axiosInstance from '@/plugins/axios'

// This is a public discovery-page feed shown to any logged-in role (not just
// hospital owners), so it uses `/hospital-promotions/public` - the only
// unauthenticated, all-hospitals route on this resource - rather than the
// hospital-owner-scoped `promotionStore` (which requires an explicit
// hospitalId for a plain "user" caller and 400s otherwise).
const UPLOAD_BASE_URL = 'http://127.0.0.1:3001/uploads'
const { t } = useI18n()
const promotions = ref<{ id: number; image: string | null }[]>([])

onMounted(async () => {
  try {
    const { data } = await axiosInstance.get('/hospital-promotions/public')
    promotions.value = (data as { id: number; image: string | null }[]).map((item) => ({
      id: item.id,
      image: item.image ? `${UPLOAD_BASE_URL}/${item.image}` : null
    }))
  } catch (error) {
    console.log(error)
  }
})
</script>
