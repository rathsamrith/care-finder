<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRating } from '@/components/ui/star-rating'
import { Trash2Icon } from '@lucide/vue'
import { ref, onMounted } from 'vue'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import { FeedbackList } from '@/stores/feedback-list'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const store = useAuthStore()
const feedbackList = FeedbackList()

async function fetchFeedback() {
  await feedbackList.fetchFeedback(store.hospital.id)
}

const replyForm = ref(false)
const outerVisible = ref(false)
const openReplyFrom = () => {
  outerVisible.value = false
  replyForm.value = true
}
const replyFeedback = ref({
  rate_id: '',
  content: ''
})
const sendReply = async () => {
  try {
    if (replyFeedback.value.content === '') {
      replyForm.value = true
      toast.warning(t('hospitalDash.feedback.replyRequired'))
    } else {
      replyForm.value = false
      await axiosInstance.post('/rate-replies', {
        rateId: replyFeedback.value.rate_id,
        content: replyFeedback.value.content
      })
      toast.success(t('hospitalDash.feedback.replySent'))
      await feedbackList.showFeedback(Number(replyFeedback.value.rate_id))
    }
  } catch (e) {
    console.log(e)
  }
}
onMounted(() => {
  fetchFeedback()
})
const removeReply = async (id: any) => {
  try {
    const { data } = await axiosInstance.delete(`/rate-replies/${id.id}`)
    await feedbackList.showFeedback(id.rate_id)
    toast.success(data.message ?? t('hospitalDash.feedback.replyRemoved'))
  } catch (e) {
    console.error(e)
    toast.warning(t('hospitalDash.feedback.removeFailed'))
  }
}

function showDetails(row: any) {
  outerVisible.value = true
  feedbackList.showFeedback(row)
  replyFeedback.value.rate_id = row
}
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="store.hospital != 'No hospital'">
    <SectionHeading :kicker="t('hospitalDash.feedback.kicker')">
      <template #title>{{ t('hospitalDash.feedback.title') }}</template>
    </SectionHeading>
    <Card class="mt-6">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('hospitalDash.feedback.profile') }}</TableHead>
              <TableHead>{{ t('hospitalDash.feedback.content') }}</TableHead>
              <TableHead>{{ t('hospitalDash.feedback.from') }}</TableHead>
              <TableHead>{{ t('hospitalDash.feedback.to') }}</TableHead>
              <TableHead>{{ t('hospitalDash.feedback.star') }}</TableHead>
              <TableHead class="text-right">{{ t('hospitalDash.appointments.action') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in feedbackList.allFeedback" :key="row.id">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar class="size-8">
                    <AvatarImage v-if="row.user.profile !== 'No profile'" :src="row.user.profile" />
                    <AvatarFallback>{{ row.user.full_name?.charAt(0) }}</AvatarFallback>
                  </Avatar>
                  <p class="text-sm text-ink">{{ row.user.full_name }}</p>
                </div>
              </TableCell>
              <TableCell>{{ row.content }}</TableCell>
              <TableCell><strong>{{ row.user.full_name }}</strong></TableCell>
              <TableCell>{{ row.to }}</TableCell>
              <TableCell>
                <StarRating :model-value="row.star" readonly />
              </TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" @click="showDetails(row.id)">{{ t('hospitalDash.feedback.seeDetails') }}</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!feedbackList.allFeedback.length" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('hospitalDash.feedback.empty') }}
        </p>
      </CardContent>
    </Card>

    <Dialog v-model:open="outerVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.feedback.detailsTitle') }}</DialogTitle>
        </DialogHeader>
        <Button @click="openReplyFrom">{{ t('hospitalDash.feedback.reply') }}</Button>
        <div class="mt-4 space-y-3">
          <div
            v-for="feed in feedbackList.feedbackDetails.replies"
            :key="feed.id"
            class="flex items-start justify-between rounded-2xl bg-slate-50 p-4"
          >
            <div>
              <h5 class="text-sm font-semibold text-ink">{{ feed.user.name }}</h5>
              <p class="mt-1 text-sm text-slate-600"><b class="text-ink">{{ t('hospitalDash.feedback.contentLabel') }}</b> {{ feed.content }}</p>
              <p class="mt-1 text-xs text-slate-500"><b>{{ t('hospitalDash.feedback.replied') }}</b> {{ feed.created_for }}</p>
            </div>
            <Button variant="ghost" size="icon" @click="removeReply(feed)">
              <Trash2Icon class="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="replyForm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.feedback.replyTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <p class="text-sm font-semibold text-ink">{{ t('hospitalDash.feedback.replyContent') }}</p>
          <Textarea v-model="replyFeedback.content" />
        </div>
        <DialogFooter>
          <Button @click="sendReply">{{ t('hospitalDash.feedback.send') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
