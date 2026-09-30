<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// A proper confirmation step for destructive actions (replaces window.confirm).
// The caller owns `open` and runs the action on `confirm`; the dialog closes
// itself on cancel, and the caller closes it when the action is done.
defineProps<{ title: string; message: string; confirmLabel: string; cancelLabel: string; busy?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md" data-testid="confirm-dialog">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ message }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" :disabled="busy" @click="open = false">{{ cancelLabel }}</Button>
        <Button variant="destructive" :disabled="busy" data-testid="confirm-yes" @click="emit('confirm')">{{ confirmLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
