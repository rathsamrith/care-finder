<template>
  <section class="mt-10">
    <SectionHeading :kicker="$t('hospitals.search.kicker')">
      <template #title>{{ $t('hospitals.search.title') }}</template>
    </SectionHeading>

    <Card padding="p-4 sm:p-6" class="mt-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select v-model="selectedOptions">
          <SelectTrigger class="w-full sm:w-60"><SelectValue /></SelectTrigger>
          <SelectContent class="max-h-64">
            <SelectItem :value="ALL">{{ $t('hospitals.search.allProvinces') }}</SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{{ $t('hospitals.search.province') }}</SelectLabel>
              <SelectItem v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select v-model="selectedCategory">
          <SelectTrigger class="w-full sm:w-60"><SelectValue /></SelectTrigger>
          <SelectContent class="max-h-64">
            <SelectItem :value="ALL">{{ $t('hospitals.search.allCategories') }}</SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{{ $t('hospitals.search.category') }}</SelectLabel>
              <SelectItem v-for="item in category" :key="item.id" :value="item.name">{{ item.name }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div class="relative w-full flex-1">
          <SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchQuery" :placeholder="$t('hospitals.search.placeholder')" class="w-full pl-9" />
        </div>
      </div>
    </Card>

    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <article
        v-for="(card, index) in filteredCards"
        :key="index"
        class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-soft-lg"
      >
        <div class="h-44 w-full overflow-hidden">
          <img
            v-if="card.cover_image !== 'No Cover'"
            :src="card.cover_image"
            :alt="$t('hospitals.search.coverAlt')"
            class="h-full w-full object-cover"
          />
          <img
            v-else
            src="https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1"
            :alt="$t('hospitals.search.coverAlt')"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-5">
          <h4 class="text-base font-semibold text-ink">{{ card.name }}</h4>
          <p class="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <ClockIcon class="size-3.5" />
            {{ card.open_time }}
          </p>
          <p class="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <MapPinIcon class="size-3.5" />
            {{ card.province }}
          </p>
          <p class="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <PhoneIcon class="size-3.5" />
            {{ card.phone_number }}
          </p>
          <p class="mt-1 text-sm text-slate-500">{{ card.street_address }}</p>
          <div class="mt-3 flex items-center gap-2">
            <StarRating :model-value="card.average_rating" readonly :size="16" />
            <span class="text-sm font-medium text-gold">{{ $t('hospitals.search.points', { rating: card.average_rating }) }}</span>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <UiButton variant="link" @click="seeDetails(card.id)">
              <InfoIcon class="size-3.5" />
              {{ $t('hospitals.search.seeDetails') }}
            </UiButton>
            <UiButton variant="icon" @click="addToFavorites(card.id)">
              <TagIcon class="size-4" />
            </UiButton>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { ClockIcon, InfoIcon, MapPinIcon, PhoneIcon, SearchIcon, TagIcon } from '@lucide/vue'
import axiosInstance from '@/plugins/axios'
import { toast } from 'vue-sonner'
import { hospitalDetailStore } from '@/stores/hospital-detail'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import StarRating from '@/components/ui/star-rating/star-rating.vue'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
const details = hospitalDetailStore()
const ALL = '__all__'
export default {
  name: 'HospitalAddressCard',
  components: {
    SearchIcon,
    ClockIcon,
    MapPinIcon,
    PhoneIcon,
    InfoIcon,
    TagIcon,
    SectionHeading,
    Card,
    UiButton,
    StarRating,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
    Input
  },
  data() {
    return {
      ALL,
      selectedOptions: ALL,
      options: [
        { value: 'Banteay Meanchey', label: 'Banteay Meanchey' },
        { value: 'Battambang', label: 'Battambang' },
        { value: 'Kampong Cham', label: 'Kampong Cham' },
        { value: 'Kampong Chhnang', label: 'Kampong Chhnang' },
        { value: 'Kampong Thom', label: 'Kampong Thom' },
        { value: 'Kampong Speu', label: 'Kampong Speu' },
        { value: 'Kampot', label: 'Kampot' },
        { value: 'Kandal', label: 'Kandal' },
        { value: 'Kep', label: 'Kep' },
        { value: 'Koh Kong', label: 'Koh Kong' },
        { value: 'Kratié', label: 'Kratié' },
        { value: 'Mondulkiri', label: 'Mondulkiri' },
        { value: 'Oddar Meanchey', label: 'Oddar Meanchey' },
        { value: 'Pailin', label: 'Pailin' },
        { value: 'Phnom Penh', label: 'Phnom Penh' },
        { value: 'Preah Sihanouk', label: 'Preah Sihanouk' },
        { value: 'Preah Vihear', label: 'Preah Vihear' },
        { value: 'Prey Veng', label: 'Prey Veng' },
        { value: 'Pursat', label: 'Pursat' },
        { value: 'Ratanakiri', label: 'Ratanakiri' },
        { value: 'Siem Reap', label: 'Siem Reap' },
        { value: 'Stung Treng', label: 'Stung Treng' },
        { value: 'Svay Rieng', label: 'Svay Rieng' },
        { value: 'Takéo', label: 'Takéo' },
        { value: 'Tboung Khmum', label: 'Tboung Khmum' }
      ],
      searchQuery: '',
      cardAddress: [],
      selectedCategory: ALL,
      category: []
    }
  },
  computed: {
    filteredCards() {
      return this.cardAddress.filter((card) => {
        const matchesTitle = card.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        const matchesOptions = this.selectedOptions === ALL || this.selectedOptions === card.province
        const matchesCategory = this.selectedCategory === ALL || this.selectedCategory === card.category.name
        return matchesTitle && matchesOptions && matchesCategory
      })
    }
  },
  methods: {
    alertMessage(title, message, type) {
      toast[type](message)
    },
    async fetchHospital() {
      try {
        const { data } = await axiosInstance.get('/hospitals/list')
        this.cardAddress = data
      } catch (error) {
        console.log(error)
        return null
      }
    },
    async categoryHospital() {
      try {
        const { data } = await axiosInstance.get('/categories/list')
        this.category = data
      } catch (error) {
        return null
      }
    },
    async addToFavorites(card) {
      try {
        await axiosInstance.post('/favourites', { hospitalId: card })
        this.alertMessage(this.$t('hospitals.search.favorite'), this.$t('hospitals.search.addedToFavorites'), 'success')
      } catch (error) {
        console.log(error)
        this.alertMessage(this.$t('hospitals.search.favorite'), this.$t('hospitals.search.somethingWrong'), 'warning')
      }
    },
    seeDetails(id) {
      details.id = id
      this.$router.push(`/hospital/detail?id=${id}`)
      details.fetchHospitalDetail(id)
    }
  },
  mounted() {
    this.fetchHospital()
    this.categoryHospital()
  }
}
</script>
