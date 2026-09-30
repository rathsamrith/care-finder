<script lang="ts">
import { defineComponent } from 'vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'

export default defineComponent({
  components: { Card, UiButton },
  props: {
    department: {
      required: true,
      type: Object
    }
  },
  emits: ['update', 'remove']
})
</script>
<template>
  <Card padding="p-5" class="flex gap-4">
    <img
      v-if="department.image !== 'No profile'"
      :src="department.image"
      alt=""
      class="h-24 w-24 flex-none rounded-2xl object-cover"
    />
    <img
      v-else
      src="https://i0.wp.com/sunrisedaycamp.org/wp-content/uploads/2020/10/placeholder.png?ssl=1"
      alt=""
      class="h-24 w-24 flex-none rounded-2xl object-cover"
    />
    <div class="flex-1">
      <h4 class="text-base font-semibold text-ink">{{ department.name }}</h4>
      <p class="mt-1 text-sm text-slate-600">{{ department.description ? department.description : $t('hospitalCards.noDescription') }}</p>
      <div class="mt-4 flex gap-3">
        <UiButton variant="subtle" @click="$emit('update', department)">{{ $t('hospitalCards.update') }}</UiButton>
        <UiButton variant="danger" @click="$emit('remove', department)">{{ $t('hospitalCards.remove') }}</UiButton>
      </div>
    </div>
  </Card>
</template>
