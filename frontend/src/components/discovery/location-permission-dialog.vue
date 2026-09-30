<template>
  <Dialog v-model:open="visible">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <IconChip>
          <MapPinIcon class="size-5" />
        </IconChip>
        <DialogTitle class="mt-4">{{ t('discovery.locationDialog.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('discovery.locationDialog.description') }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <UiButton variant="subtle" @click="deny">{{ t('discovery.locationDialog.notNow') }}</UiButton>
        <UiButton variant="primary" @click="allow">{{ t('discovery.locationDialog.allow') }}</UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MapPinIcon } from '@lucide/vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

const { t } = useI18n()

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'allow'): void
  (e: 'deny'): void
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (visible.value = v)
)
watch(visible, (v) => emit('update:modelValue', v))

function allow() {
  visible.value = false
  emit('allow')
}

function deny() {
  visible.value = false
  emit('deny')
}
</script>
