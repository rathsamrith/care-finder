<script lang="ts">
import { defineComponent, ref } from 'vue'
import axiosInstance from '@/plugins/axios'
import { setActiveHospitalId } from '@/lib/active-hospital'
import { apiErrorMessage } from '@/lib/api-error'
import { toast } from 'vue-sonner'
import { provinces } from '@/province/province'
import { districts } from '@/province/district'
import { communes } from '@/province/commune'
import { Building2Icon } from '@lucide/vue'
import Card from '@/components/ui/card.vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
export default defineComponent({
  name: 'HospitalSet',
  components: {
    Building2Icon,
    Card,
    IconChip,
    UiButton,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  },
  data() {
    return {
      categories: [],
      province: provinces,
      district: [],
      commune: [],
      village: [],
      dialogVisible: ref(false),
      submissionFrom: {
        name: '',
        category_id: '',
        street_address: '',
        village: '',
        commune: '',
        district: '',
        province: '',
        latitude: '',
        longitude: '',
        open_time: '',
        close_time: ''
      }
    }
  },
  methods: {
    async fetchCategory() {
      try {
        const { data } = await axiosInstance.get('/categories/list')
        this.categories = data
        console.log(data)
      } catch (error) {
        console.log(error)
      }
    },
    async submitForm() {
      this.dialogVisible = false
      console.log(this.submissionFrom)
      const f = this.submissionFrom
      // The API wants camelCase, `categoryId` as a number, and optional values
      // left out - an empty string would fail its time/number validation.
      const blank = (v: string) => (v && String(v).trim() ? String(v).trim() : undefined)
      const payload = {
        name: f.name.trim(),
        categoryId: Number(f.category_id),
        streetAddress: blank(f.street_address),
        village: blank(f.village),
        commune: blank(f.commune),
        district: blank(f.district),
        province: blank(f.province),
        latitude: blank(f.latitude),
        longitude: blank(f.longitude),
        openTime: blank(f.open_time),
        closeTime: blank(f.close_time)
      }
      if (!payload.name || !payload.categoryId) {
        this.dialogVisible = true
        return toast.error(this.$t('hospitals.setup.requiredFields'))
      }
      try {
        const { data } = await axiosInstance.post('/hospitals', payload)
        // Make the hospital just created the active one, then load its page fresh.
        if (data?.id) setActiveHospitalId(data.id)
        window.location.assign('/myHospital')
      } catch (error) {
        this.dialogVisible = true // keep what they typed
        toast.error(apiErrorMessage(error, this.$t('hospitals.setup.failed')))
      }
    },
    filterDistrict(id: any) {
      this.district = districts.filter((district) => district.province_id === id)
    },
    filterCommune(id: any) {
      this.commune = communes.filter((commune) => commune.district_id === id)
    },
    setLatLng(commune: any) {
      this.submissionFrom.latitude = commune.geodata.lat
      this.submissionFrom.longitude = commune.geodata.long
    }
  },
  mounted() {
    this.fetchCategory()
  }
})
</script>

<template>
  <div class="mx-auto max-w-xl py-16 text-center">
    <Card padding="p-8 sm:p-10">
      <IconChip class="mx-auto" size="h-14 w-14">
        <Building2Icon class="size-6" />
      </IconChip>
      <h2 class="mt-4 text-xl font-semibold text-ink">{{ $t('hospitals.setup.emptyTitle') }}</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        {{ $t('hospitals.setup.emptyBody') }}
      </p>
      <div class="mt-6">
        <UiButton variant="primary" @click="dialogVisible = true">{{ $t('hospitals.setup.setUp') }}</UiButton>
      </div>
    </Card>

    <Dialog v-model:open="dialogVisible">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ $t('hospitals.setup.dialogTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>{{ $t('hospitals.setup.name') }}</Label>
            <Input v-model="submissionFrom.name" />
          </div>
          <div class="space-y-2">
            <Label>{{ $t('hospitals.setup.category') }}</Label>
            <Select v-model="submissionFrom.category_id">
              <SelectTrigger class="w-full"><SelectValue :placeholder="$t('hospitals.setup.selectCategory')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.openTime') }}</Label>
              <Input v-model="submissionFrom.open_time" type="time" />
            </div>
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.closeTime') }}</Label>
              <Input v-model="submissionFrom.close_time" type="time" />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.province') }}</Label>
              <Select
                v-model="submissionFrom.province"
                @update:model-value="(v) => filterDistrict(province.find((pro) => pro.name_en === v)?.id)"
              >
                <SelectTrigger class="w-full"><SelectValue :placeholder="$t('hospitals.setup.selectProvince')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in province" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.district') }}</Label>
              <Select
                v-model="submissionFrom.district"
                @update:model-value="(v) => filterCommune(district.find((pro) => pro.name_en === v)?.id)"
              >
                <SelectTrigger class="w-full"><SelectValue :placeholder="$t('hospitals.setup.selectDistrict')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in district" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.commune') }}</Label>
              <Select
                v-model="submissionFrom.commune"
                @update:model-value="(v) => setLatLng(commune.find((pro) => pro.name_en === v))"
              >
                <SelectTrigger class="w-full"><SelectValue :placeholder="$t('hospitals.setup.selectCommune')" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pro in commune" :key="pro.id" :value="pro.name_en">{{ pro.name_en }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>{{ $t('hospitals.setup.village') }}</Label>
              <Input v-model="submissionFrom.village" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>{{ $t('hospitals.setup.streetAddress') }}</Label>
            <Input v-model="submissionFrom.street_address" />
          </div>
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="dialogVisible = false">{{ $t('hospitals.setup.cancel') }}</UiButton>
          <UiButton variant="primary" @click="submitForm">{{ $t('hospitals.setup.submit') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
