<script setup lang="ts">
import { Building2Icon, CameraIcon, Loader2Icon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error'
import { isBlank } from '@/lib/hospital-profile'
import axiosInstance from '@/plugins/axios'

// The hospital's cover photo. Changing it is an explicit, visible button (the old
// page only reacted to a click on the picture itself); the file is checked before
// upload, progress shows, and the result is reported. With no cover yet it shows
// an inviting empty state instead of a blank box.
const props = defineProps<{ hospitalId: number | string; cover?: string | null }>()
const emit = defineEmits<{ uploaded: [] }>()
const { t } = useI18n()

const MAX_BYTES = 10 * 1024 * 1024 // the API's upload limit
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const hasCover = computed(() => !isBlank(props.cover))

const pick = () => input.value?.click()

const onFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // picking the same file again should still fire
  if (!file) return

  if (!ALLOWED.includes(file.type)) return void toast.error(t('hospitalProfile.cover.wrongType'))
  if (file.size > MAX_BYTES) return void toast.error(t('hospitalProfile.cover.tooBig'))

  uploading.value = true
  try {
    const body = new FormData()
    body.append('image', file)
    await axiosInstance.post(`/hospitals/${props.hospitalId}/uploadCover`, body)
    toast.success(t('hospitalProfile.cover.uploaded'))
    emit('uploaded')
  } catch (e) {
    toast.error(apiErrorMessage(e, t('hospitalProfile.cover.failed')))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="relative h-56 overflow-hidden rounded-2xl sm:h-72" data-testid="cover">
    <img v-if="hasCover" :src="cover!" :alt="t('hospitalDash.hospital.coverAlt')" class="h-full w-full object-cover" />
    <div
      v-else
      class="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-accent/30 bg-gradient-to-br from-accent-tint to-white text-center"
      data-testid="cover-empty"
    >
      <Building2Icon class="size-12 text-accent/60" />
      <p class="font-semibold text-ink">{{ t('hospitalProfile.cover.emptyTitle') }}</p>
      <p class="max-w-xs px-4 text-sm text-slate-600">{{ t('hospitalProfile.cover.emptyHelp') }}</p>
    </div>

    <div v-if="uploading" class="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 font-medium text-ink" role="status">
      <Loader2Icon class="size-5 animate-spin" />{{ t('hospitalProfile.cover.uploading') }}
    </div>

    <Button
      type="button"
      :variant="hasCover ? 'secondary' : 'default'"
      size="sm"
      class="absolute bottom-3 right-3 shadow-md"
      :disabled="uploading"
      @click="pick"
    >
      <CameraIcon />{{ hasCover ? t('hospitalProfile.cover.change') : t('hospitalProfile.cover.add') }}
    </Button>
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" data-testid="cover-input" @change="onFile" />
  </div>
</template>
