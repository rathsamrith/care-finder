<template>
  <div>
    <div class="flex items-center justify-between">
      <SectionHeading :kicker="t('hospitalDetail.manage.kicker')">
        <template #title>{{ t('hospitalDetail.manage.heading') }}</template>
      </SectionHeading>
      <UiButton variant="primary" @click="showAddServiceDialog">{{ t('hospitalDetail.manage.add') }}</UiButton>
    </div>

    <Dialog v-model:open="centerDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ formTitle }}</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col items-center gap-4">
          <img
            :src="imageUrl || 'https://via.placeholder.com/300'"
            :alt="t('hospitalDetail.manage.imageAlt')"
            class="h-48 w-full rounded-2xl object-cover"
          />
          <input type="file" class="w-full text-sm" @change="handleFileChange" />
          <Input v-model="newServiceTitle" :placeholder="t('hospitalDetail.manage.titlePlaceholder')" />
        </div>
        <DialogFooter>
          <UiButton variant="subtle" @click="centerDialogVisible = false">{{ t('hospitalDetail.manage.cancel') }}</UiButton>
          <UiButton variant="primary" @click="saveService">{{ t('hospitalDetail.manage.confirm') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="service in services" :key="service.id" padding="p-0" class="overflow-hidden text-center">
        <img :src="service.image" alt="" class="h-36 w-full object-cover" />
        <div class="p-4">
          <h6 class="text-sm font-semibold text-ink">{{ service.name }}</h6>
          <div class="mt-3 flex justify-center gap-2">
            <UiButton variant="danger" @click="removeService(service.id)">{{ t('hospitalDetail.manage.delete') }}</UiButton>
            <UiButton variant="subtle" @click="showEditServiceDialog(service)">{{ t('hospitalDetail.manage.edit') }}</UiButton>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script lang="ts">
import axiosInstance from '@/plugins/axios'
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'

export default defineComponent({
  components: { SectionHeading, Card, UiButton, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input },
  setup(_, { emit }) {
    const { t } = useI18n()
    const authStore = useAuthStore()
    const centerDialogVisible = ref(false)
    const newServiceTitle = ref('')
    const services = ref<any[]>([])
    const newServiceImage = ref<File | null>(null)
    const imageUrl = ref<string | null>(null)
    const isEditing = ref(false)
    const currentServiceId = ref<number | null>(null)
    const isAddTitle = ref(true)
    const formTitle = computed(() => t(isAddTitle.value ? 'hospitalDetail.manage.addTitle' : 'hospitalDetail.manage.editTitle'))

    async function fetchServices() {
      try {
        const response = await axiosInstance.get('/hospital-services', {
          params: { hospitalId: authStore.hospital.id }
        })
        services.value = response.data
      } catch (error) {
        console.error('Failed to fetch services:', error)
      }
    }

    const open2 = (_title: string, message: any, type: 'success' | 'warning' | 'error' | 'info') => {
      toast[type](message)
    }
    const handleFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        newServiceImage.value = target.files[0]
        imageUrl.value = URL.createObjectURL(newServiceImage.value)
      }
    }

    const addService = async () => {
      try {
        const formData = new FormData()
        formData.append('hospitalId', String(authStore.hospital.id))
        formData.append('name', newServiceTitle.value)
        if (newServiceImage.value) {
          formData.append('image', newServiceImage.value)
        }
        const { data } = await axiosInstance.post('/hospital-services', formData)
        services.value.push(data)
        await fetchServices()
        resetForm()
      } catch (error) {
        console.error('Failed to add service:', error)
      }
    }
    const editService = async () => {
      try {
        const formData = new FormData()
        formData.append('name', newServiceTitle.value)
        if (newServiceImage.value) {
          formData.append('image', newServiceImage.value)
        }
        const { data } = await axiosInstance.put(`/hospital-services/${currentServiceId.value}`, formData)
        const index = services.value.findIndex((service) => service.id === currentServiceId.value)
        if (index !== -1) {
          services.value[index] = { ...services.value[index], ...data }
          services.value = [...services.value]
        }
        resetForm()
        open2(t('hospitalDetail.manage.toastServices'), t('hospitalDetail.manage.updated'), 'success')
      } catch (error) {
        console.error('Failed to update service:', error)
        open2(t('hospitalDetail.manage.toastServices'), t('hospitalDetail.manage.updateFailed'), 'warning')
      }
    }

    const saveService = () => {
      if (isEditing.value) {
        editService()
      } else {
        addService()
      }
    }

    const showEditServiceDialog = (service: any) => {
      isEditing.value = true
      isAddTitle.value = false
      centerDialogVisible.value = true
      newServiceTitle.value = service.name
      imageUrl.value = service.image
      currentServiceId.value = service.id
      newServiceImage.value = null
    }

    const removeService = async (id: number) => {
      try {
        await axiosInstance.delete(`/hospital-services/${id}`)
        services.value = services.value.filter((service) => service.id !== id)
        emit('remove', id)
      } catch (error) {
        console.error('Error removing service:', error)
      }
    }

    const showAddServiceDialog = () => {
      resetForm()
      isAddTitle.value = true
      centerDialogVisible.value = true
      isEditing.value = false
    }

    const resetForm = () => {
      newServiceTitle.value = ''
      newServiceImage.value = null
      imageUrl.value = null
      currentServiceId.value = null
      centerDialogVisible.value = false
    }

    onMounted(() => {
      fetchServices()
    })

    return {
      t,
      centerDialogVisible,
      newServiceTitle,
      newServiceImage,
      imageUrl,
      services,
      removeService,
      handleFileChange,
      saveService,
      showAddServiceDialog,
      showEditServiceDialog,
      formTitle
    }
  }
})
</script>
