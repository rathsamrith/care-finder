<template>
  <section class="mt-10">
    <SectionHeading :kicker="$t('favorites.kicker')">
      <template #title>{{ $t('favorites.title') }}</template>
    </SectionHeading>
    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <article
        v-for="cardFavorite in cardFavorites"
        :key="cardFavorite.id"
        class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-soft-lg"
      >
        <div class="h-44 w-full overflow-hidden">
          <img
            v-if="cardFavorite.hospital.cover_image !== 'No Cover'"
            :src="cardFavorite.hospital.cover_image"
            :alt="$t('discovery.hospitalCoverAlt')"
            class="h-full w-full object-cover"
          />
          <img
            v-else
            src="https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1"
            :alt="$t('discovery.hospitalCoverAlt')"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-5">
          <h4 class="text-base font-semibold text-ink">{{ cardFavorite.hospital.name }}</h4>
          <p class="mt-2 text-sm text-slate-600">{{ cardFavorite.hospital.open_time }}</p>
          <p class="text-sm text-slate-600">{{ cardFavorite.hospital.province }}</p>
          <p class="text-sm text-slate-600">{{ cardFavorite.hospital.phone_number }}</p>
          <p class="text-sm text-slate-500">{{ cardFavorite.hospital.street_address }}</p>
          <div class="mt-3 flex items-center gap-2">
            <StarRating :model-value="cardFavorite.hospital.average_rating" readonly :size="16" />
            <span class="text-sm font-medium text-gold">{{ $t('favorites.points', { rating: cardFavorite.hospital.average_rating }) }}</span>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <UiButton variant="subtle" @click="removeFavorites(cardFavorite.id)">{{ $t('favorites.remove') }}</UiButton>
            <UiButton variant="link" @click="seeDetails(cardFavorite.hospital.id)">{{ $t('favorites.seeDetail') }}</UiButton>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import axiosInstance from '@/plugins/axios'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import { toast } from 'vue-sonner'
import SectionHeading from '@/components/ui/section-heading.vue'
import UiButton from '@/components/ui/button.vue'
import StarRating from '@/components/ui/star-rating/star-rating.vue'

const details = hospitalDetailStore()
export default {
  name: 'CardAddress',
  components: { SectionHeading, UiButton, StarRating },
  data() {
    return {
      selectedOptions: [],
      searchQuery: '',
      cardFavorites: []
    }
  },
  computed: {
    filteredCards() {
      return this.cardFavorites.filter((card) => {
        const matchesTitle = card.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        const matchesOptions =
          this.selectedOptions.length === 0 || this.selectedOptions.includes(card.address)
        return matchesTitle && matchesOptions
      })
    }
  },
  methods: {
    async userFavorite() {
      try {
        const { data } = await axiosInstance.get('/favourites')
        console.log(data)
        this.cardFavorites = data
      } catch (error) {
        console.log(error)
      }
    },
    open2(title, message, type) {
      toast[type === 'danger' ? 'error' : type](message)
    },
    seeDetails(id) {
      details.id = id
      this.$router.push(`/hospital/detail?id=${id}`)
      details.fetchHospitalDetail(id)
    },
    async removeFavorites(id) {
      try {
        const { data } = await axiosInstance.delete(`/favourites/${id}`)
        this.open2(this.$t('favorites.toastTitle'), data.message ?? this.$t('favorites.removed'), 'success')
        await this.userFavorite()
      } catch (error) {
        this.open2(this.$t('favorites.toastTitle'), this.$t('favorites.removeFailed'), 'danger')
        console.log(error)
      }
    }
  },
  mounted() {
    this.userFavorite()
  }
}
</script>
