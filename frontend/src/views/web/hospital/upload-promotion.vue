<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="userStore.hospital != 'No hospital'">
    <div class="flex items-center justify-between">
      <SectionHeading :kicker="t('hospitalDash.promotion.kicker')">
        <template #title>{{ t('nav.promotions') }}</template>
      </SectionHeading>
      <Button @click="centerDialogVisible = true">{{ t('hospitalDash.promotion.addItem') }}</Button>
    </div>

    <Card class="mt-6">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('hospitalDash.promotion.image') }}</TableHead>
              <TableHead>{{ t('hospitalDash.promotion.titleCol') }}</TableHead>
              <TableHead>{{ t('hospitalDash.promotion.startDate') }}</TableHead>
              <TableHead>{{ t('hospitalDash.promotion.endDate') }}</TableHead>
              <TableHead class="text-right">{{ t('hospitalDash.promotion.operations') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, index) in store.promotions" :key="row.id">
              <TableCell>
                <img :src="row.image" class="h-16 w-16 rounded-xl object-cover" alt="" />
              </TableCell>
              <TableCell>{{ row.title }}</TableCell>
              <TableCell>{{ row.startDate }}</TableCell>
              <TableCell>{{ row.endDate }}</TableCell>
              <TableCell class="text-right">
                <Button variant="destructive" size="sm" @click="deleteRow(index, row.id)">{{ t('hospitalDash.doctors.remove') }}</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!store.promotions.length" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('hospitalDash.promotion.empty') }}
        </p>
      </CardContent>
    </Card>

    <Dialog v-model:open="centerDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.promotion.addPromotion') }}</DialogTitle>
        </DialogHeader>
        <div>
          <img
            :src="imageUrl || 'https://t4.ftcdn.net/jpg/01/64/16/59/360_F_164165971_ELxPPwdwHYEhg4vZ3F4Ej7OmZVzqq4Ov.jpg'"
            alt=""
            class="h-48 w-full cursor-pointer rounded-2xl object-cover"
            @click="triggerFileInput"
          />
          <input type="file" ref="fileInput" style="display: none" @change="onFileChange" />
        </div>
        <div class="mt-4 space-y-4">
          <div>
            <p class="text-sm font-semibold text-ink">{{ t('hospitalDash.promotion.titleCol') }}</p>
            <Input v-model="form.title" :placeholder="t('hospitalDash.promotion.inputPlaceholder')" class="mt-1" />
          </div>
          <div>
            <p class="text-sm font-semibold text-ink">{{ t('hospitalDash.promotion.description') }}</p>
            <Input v-model="form.description" :placeholder="t('hospitalDash.promotion.inputPlaceholder')" class="mt-1" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-semibold text-ink">{{ t('hospitalDash.promotion.startDate') }}</p>
              <div class="mt-1">
                <DatePicker v-model="form.startDate" />
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-ink">{{ t('hospitalDash.promotion.endDate') }}</p>
              <div class="mt-1">
                <DatePicker v-model="form.endDate" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="centerDialogVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="onAddItem">{{ t('hospitalDash.promotion.upload') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { promotionStore } from '@/stores/promotion-store'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import { useAuthStore } from '@/stores/auth-store'

const { t } = useI18n()
const centerDialogVisible = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const imageUrl = ref('')
const userStore = useAuthStore()
const form = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  image: ''
})
const store = promotionStore()
const deleteRow = (index: number, id: any) => {
  store.deletePromotion(id)
  store.promotions.splice(index, 1)
}

const onAddItem = () => {
  store.addPromotion({ ...form.value, hospitalId: userStore.hospital.id })
  store.fetchPromotions()
  centerDialogVisible.value = false
  form.value.title = ''
  form.value.description = ''
  form.value.startDate = ''
  form.value.endDate = ''
  form.value.image = ''
  imageUrl.value = ''
}

const triggerFileInput = () => {
  fileInput.value?.click()
}
onMounted(() => {
  store.fetchPromotions()
})

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  form.value.image = file as any
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}
</script>
