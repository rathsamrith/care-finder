<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.comments.kicker')">
      <template #title>{{ t('hospitalDetail.comments.heading') }}</template>
    </SectionHeading>

    <Card padding="p-6 sm:p-8" class="mt-6">
      <Input v-model="form.content" :placeholder="t('hospitalDetail.commentPlaceholder')" />
      <div class="mt-4">
        <h4 class="text-sm font-semibold text-ink">{{ t('hospitalDetail.rateThis') }}</h4>
        <p class="text-sm text-slate-500">{{ t('hospitalDetail.tellOthers') }}</p>
        <StarRating v-model="form.star" :size="24" class="mt-2" />
      </div>
      <div class="mt-6 flex gap-3">
        <UiButton variant="subtle" type="button">{{ t('hospitalDetail.comments.cancel') }}</UiButton>
        <UiButton variant="primary" type="button" @click="submit">{{ t('hospitalDetail.comments.submit') }}</UiButton>
      </div>
    </Card>

    <div class="mt-6">
      <UiButton variant="subtle" @click="showAll = !showAll">
        {{ showAll ? t('hospitalDetail.comments.hide') : t('hospitalDetail.comments.showAll') }}
      </UiButton>

      <div v-if="showAll" class="mt-4 space-y-4">
        <Card v-for="comment in feedbacks" :key="comment.id" padding="p-5">
          <div class="flex gap-4">
            <Avatar class="size-[56px]">
              <AvatarImage
                :src="comment.from.profile !== 'No profile' ? comment.from.profile : 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
              />
              <AvatarFallback>{{ comment.user.full_name?.[0] }}</AvatarFallback>
            </Avatar>
            <div class="flex-1">
              <p class="text-sm text-ink">
                <strong>{{ comment.user.full_name }}</strong>
                <span class="text-slate-500"> &middot; {{ comment.created_at }}</span>
              </p>
              <p class="mt-1 text-sm text-slate-600">{{ comment.content }}</p>
              <div class="mt-2 flex items-center gap-2">
                <StarRating :model-value="comment.star" readonly :size="16" />
                <span class="text-sm font-medium text-gold">{{ t('hospitalDetail.comments.stars', { count: comment.star }) }}</span>
              </div>
              <div class="mt-3 flex items-center gap-3">
                <UiButton variant="link" @click="$emit('show-replies', comment.replies)">
                  {{ t('hospitalDetail.comments.replies', { count: comment.replies.length }) }}
                </UiButton>
                <UiButton variant="link" @click="$emit('edit-comment', comment)">{{ t('hospitalDetail.comments.edit') }}</UiButton>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import StarRating from '@/components/ui/star-rating/star-rating.vue'
import { Input } from '@/components/ui/input'

const { t } = useI18n()

defineProps<{ feedbacks: any[] }>()
const emit = defineEmits<{
  (e: 'submit', payload: { content: string; star: number }): void
  (e: 'edit-comment', comment: any): void
  (e: 'show-replies', replies: any[]): void
}>()

const showAll = ref(false)
const form = reactive({ content: '', star: 0 })

const submit = () => {
  emit('submit', { content: form.content, star: form.star })
  form.content = ''
  form.star = 0
}
</script>
