<template>
  <section class="mt-10">
    <SectionHeading :kicker="$t('users.topHospitals.kicker')">
      <template #title>{{ $t('users.topHospitals.title') }}</template>
    </SectionHeading>
    <div class="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
      <article
        v-for="card in cards"
        :key="card.hospital.id"
        class="w-72 flex-none cursor-pointer snap-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-soft-lg"
        @click="seeDetails(card.hospital.id)"
      >
        <picture>
          <source
            media="(min-width: 768px)"
            :srcset="
              card.hospital.cover_image !== 'No cover'
                ? card.hospital.cover_image
                : 'https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1'
            "
          />
          <img
            v-if="card.hospital.cover_image !== 'No cover'"
            :src="card.hospital.cover_image"
            alt=""
            class="h-40 w-full object-cover"
          />
        </picture>
        <div class="p-5 text-center">
          <h4 class="text-base font-semibold capitalize text-ink">{{ card.hospital.name }}</h4>
          <p class="mt-2 text-sm text-slate-600">
            {{ $t('users.topHospitals.open', { open: card.hospital.open_time, close: card.hospital.close_time }) }}
          </p>
          <p class="text-sm text-slate-600">{{ card.hospital.province }}</p>
          <div class="mt-2 flex items-center justify-center gap-2">
            <StarRating :model-value="card.total_star" readonly :size="16" />
            <span class="text-sm font-medium text-slate-500">{{ ratingText(card.total_star) }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import SectionHeading from '@/components/ui/section-heading.vue'
import StarRating from '@/components/ui/star-rating/star-rating.vue'

const RATING_KEYS = ['oops', 'disappointed', 'normal', 'good', 'great']

export default defineComponent({
  name: 'CardTopHospital',
  components: { SectionHeading, StarRating },
  methods: {
    ratingText(value: number) {
      const key = RATING_KEYS[Math.round(value) - 1]
      return key ? this.$t(`users.topHospitals.ratings.${key}`) : ''
    },
    seeDetails(id: string | number) {
      this.$router.push(`/hospital/detail?id=${id}`)
      this.details.fetchHospitalDetail(id)
    }
  },
  data() {
    return {
      details: hospitalDetailStore(),
      value: 4
    }
  },
  props: ['cards']
})
</script>
