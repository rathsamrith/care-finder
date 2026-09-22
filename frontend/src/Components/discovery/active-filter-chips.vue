<template>
  <div v-if="chips.length" class="flex flex-wrap items-center gap-2">
    <button v-for="chip in chips" :key="chip.key" type="button" @click="$emit('remove', chip.key)">
      <Badge variant="neutral" class="gap-1.5">
        {{ chip.label }}
        <XIcon class="size-3" />
      </Badge>
    </button>
    <Button variant="link" size="sm" class="text-muted-foreground" @click="$emit('clear')">{{ t('discovery.clearAll') }}</Button>
  </div>
</template>

<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

defineProps<{
  chips: { key: string; label: string }[]
}>()

const { t } = useI18n()

defineEmits<{
  (e: 'remove', key: string): void
  (e: 'clear'): void
}>()
</script>
