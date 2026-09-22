<template>
  <section class="overflow-hidden rounded-[1.25rem] bg-navy shadow-soft lg:grid lg:grid-cols-[0.9fr_1.1fr]">
    <div class="flex flex-col justify-center px-6 py-10 text-center sm:px-10 lg:py-14 lg:text-left">
      <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white/70">{{ $t('favorites.header.kicker') }}</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{{ $t('favorites.header.title') }}</h1>
      <p class="mt-4 text-sm leading-6 text-white/80">
        {{ $t('favorites.header.description') }}
      </p>
    </div>
    <div class="h-64 lg:h-full">
      <Carousel :count="items.length" autoplay :interval="4000">
        <CarouselItem v-for="(item, index) in items" :key="index">
          <img :src="item.img" :alt="$t('favorites.header.alt')" class="h-full w-full object-cover" />
        </CarouselItem>
      </Carousel>
    </div>
  </section>
</template>

<script>
import { Carousel, CarouselItem } from '@/components/ui/carousel'

export default {
  name: 'HeaderView',
  components: { Carousel, CarouselItem },
  data() {
    return {
      items: [
        { img: 'https://st.depositphotos.com/1010613/2860/i/950/depositphotos_28609075-stock-photo-group-of-happy-doctors.jpg' },
        { img: 'https://www.rockfordhealthsystem.org/wp-content/uploads/2023/05/job-outlook-of-a-doctor.jpg' },
        { img: 'https://cdn.create.vista.com/api/media/small/300945744/stock-photo-portrait-of-young-woman-doctor-with-white-coat-standing-in-hospital' },
        { img: 'https://www.shutterstock.com/image-photo/you-can-order-drug-here-600nw-2138799461.jpg' },
        { img: 'https://img.freepik.com/premium-photo/healthcare-medicine-concept-attractive-male-doctor-front-medical-group-hospital-showing-thumbs-up_380164-53019.jpg' }
      ]
    }
  }
}
</script>
