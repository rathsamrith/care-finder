<template>
  <section class="mt-10">
    <SectionHeading :kicker="$t('hospitals.categories.kicker')">
      <template #title>{{ $t('hospitals.categories.title') }}</template>
    </SectionHeading>
    <div class="relative mt-6">
      <button
        type="button"
        class="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-soft transition hover:border-accent hover:text-accent"
        @click="scrollCarousel(-1)"
      >
        <ArrowLeftIcon class="size-[18px]" />
      </button>
      <div ref="carousel" class="flex snap-x gap-4 overflow-x-auto scroll-smooth px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          v-for="(item, index) in carouselItems"
          :key="index"
          class="category-card flex w-32 flex-none snap-start flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-soft transition hover:-translate-y-1 hover:shadow-soft-lg"
          @click="setCurrentSlide(index)"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/256/5961/5961654.png"
            :alt="item.name"
            class="h-16 w-16 object-contain"
          />
          <div class="text-sm font-medium text-ink">{{ item.name }}</div>
        </div>
      </div>
      <button
        type="button"
        class="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-soft transition hover:border-accent hover:text-accent"
        @click="scrollCarousel(1)"
      >
        <ArrowRightIcon class="size-[18px]" />
      </button>
    </div>
  </section>
</template>

<script lang="ts">
import axiosInstance from '@/plugins/axios.js'
import { ArrowLeftIcon, ArrowRightIcon } from '@lucide/vue'
import SectionHeading from '@/components/ui/section-heading.vue'

export default {
  components: { ArrowLeftIcon, ArrowRightIcon, SectionHeading },
  data() {
    return {
      currentSlide: 0,
      carouselItems: []
    }
  },
  methods: {
    scrollCarousel(direction) {
      const carousel = this.$refs.carousel
      const firstCardWidth = carousel.querySelector('.category-card').clientWidth + 16
      carousel.scrollLeft += direction * firstCardWidth
    },
    setCurrentSlide(index) {
      this.currentSlide = index
    },
    async fetchCategory() {
      try {
        const { data } = await axiosInstance.get('/categories/list')
        this.carouselItems = data
      } catch (error) {
        console.log(error)
      }
    }
  },
  mounted() {
    this.fetchCategory()
  }
}
</script>
