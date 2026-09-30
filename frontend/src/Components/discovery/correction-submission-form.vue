<template>
  <Dialog v-model:open="visible">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('discovery.correction.title') }}</DialogTitle>
      </DialogHeader>
      <div v-if="submitted" class="flex flex-col items-center py-4 text-center">
        <IconChip size="h-12 w-12">
          <CheckCircle2Icon class="size-5" />
        </IconChip>
        <p class="mt-4 text-sm text-slate-600">
          {{ t('discovery.correction.thanks') }}
        </p>
      </div>
      <template v-else>
        <i18n-t keypath="discovery.correction.intro" tag="p" class="text-sm text-slate-600">
          <template #name>
            <b class="text-ink">{{ hospitalName }}</b>
          </template>
        </i18n-t>
        <Textarea v-model="details" class="mt-4" :rows="5" :placeholder="t('discovery.correction.placeholder')" />
      </template>
      <DialogFooter>
        <template v-if="submitted">
          <UiButton variant="primary" @click="visible = false">{{ t('discovery.correction.close') }}</UiButton>
        </template>
        <template v-else>
          <UiButton variant="subtle" @click="visible = false">{{ t('discovery.correction.cancel') }}</UiButton>
          <UiButton variant="primary" :disabled="!details.trim() || submitting" @click="submit">
            {{ submitting ? t('discovery.correction.submitting') : t('discovery.correction.submit') }}
          </UiButton>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle2Icon } from '@lucide/vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import axiosInstance from '@/plugins/axios'

const props = defineProps<{
  modelValue: boolean
  hospitalId: string | number
  hospitalName: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const { t } = useI18n()

const visible = ref(props.modelValue)
const details = ref('')
const submitting = ref(false)
const submitted = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v) {
      submitted.value = false
      details.value = ''
    }
  }
)
watch(visible, (v) => emit('update:modelValue', v))

async function submit() {
  submitting.value = true
  try {
    const { data: categories } = await axiosInstance.get('/system-requests/categories')
    const category = categories.find((c: any) => c.name === 'Hospital Correction') ?? categories[0]
    if (!category) return
    await axiosInstance.post('/system-requests', {
      categoryId: Number(category.id),
      requestDetails: `Hospital: ${props.hospitalName} (#${props.hospitalId}) — ${details.value.trim()}`
    })
    submitted.value = true
  } catch (error) {
    console.log(error)
  } finally {
    submitting.value = false
  }
}
</script>
