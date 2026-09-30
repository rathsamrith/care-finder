<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Chart from 'chart.js/auto'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquareIcon } from '@lucide/vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import TrendStatCard from '@/components/ui/trend-stat-card.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRating } from '@/components/ui/star-rating'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FeedbackList } from '@/stores/feedback-list'
import { statusTone } from '@/lib/appointment-status'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { useAuthStore } from '@/stores/auth-store'
import axiosInstance from '@/plugins/axios'
import { toast } from 'vue-sonner'

const { t, locale } = useI18n()
const appointmentStore = hospitalAppointmentListStore()
const store = FeedbackList()
const userStore = useAuthStore()

const dialogOverflowVisible = ref(false)
const appointmentChartEl = ref<HTMLCanvasElement | null>(null)
const feedbackChartEl = ref<HTMLCanvasElement | null>(null)
let appointmentChart: Chart | null = null
let feedbackChart: Chart | null = null

// `month` comes back as "YYYY-MM" (a rolling 12-month window, not a fixed
// calendar year) - format each bucket to a short label instead of assuming
// a fixed Jan-Dec label set.
const formatMonthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-US', {
    month: 'short',
    timeZone: 'UTC'
  })

const TOOLTIP_STYLE = {
  backgroundColor: '#17201D',
  titleColor: '#FFFFFF',
  bodyColor: '#FFFFFF',
  padding: 10,
  cornerRadius: 8,
  displayColors: false
}

const GRID_STYLE = { color: 'rgba(148, 163, 184, 0.15)', drawTicks: false }

const appointmentSummary = computed(() => appointmentStore.appointmentSummary as Record<string, number>)

// Real month-over-month deltas computed from the same 12-month bucket data
// the charts below already use - not a fabricated trend number. `undefined`
// when there's no prior-month count to compare against (avoids a div-by-zero
// or a meaningless "+Infinity%").
const monthOverMonthTrend = (buckets: { month: string; count: number }[] | undefined) => {
  if (!buckets || buckets.length < 2) return undefined
  const current = buckets[buckets.length - 1].count
  const previous = buckets[buckets.length - 2].count
  if (previous === 0) return undefined
  return ((current - previous) / previous) * 100
}

const appointmentTrend = computed(() =>
  monthOverMonthTrend(appointmentStore.monthlyAppointment as { month: string; count: number }[])
)
const feedbackTrend = computed(() => monthOverMonthTrend(store.monthlyFeedbacks as { month: string; count: number }[]))
const appointmentTrendTitle = computed(() =>
  appointmentTrend.value !== undefined
    ? t(appointmentTrend.value >= 0 ? 'hospitalDash.dashboard.trendUpBookings' : 'hospitalDash.dashboard.trendDownBookings', {
        percent: Math.abs(appointmentTrend.value).toFixed(0)
      })
    : undefined
)
const feedbackTrendTitle = computed(() =>
  feedbackTrend.value !== undefined
    ? t(feedbackTrend.value >= 0 ? 'hospitalDash.dashboard.trendUpMonth' : 'hospitalDash.dashboard.trendDownMonth', {
        percent: Math.abs(feedbackTrend.value).toFixed(0)
      })
    : undefined
)

const statusBreakdown = computed(() =>
  (['Pending', 'Confirmed', 'Arrived', 'Completed', 'Canceled', 'Rejected', 'Missing'] as const).map((key) => ({
    key,
    label: t(`hospitalDash.status.${key}`),
    count: appointmentSummary.value?.[key.toLowerCase()] ?? 0,
    tone: statusTone[key]
  }))
)

const search = ref('')
const filterTableData = computed(() =>
  store.recentFeedbacks.filter(
    (item: any) => !search.value || item.user?.name?.toLowerCase().includes(search.value.toLowerCase())
  )
)

const replyFeedback = ref({ rate_id: '', content: '' })

const handleEdit = (row: any) => {
  dialogOverflowVisible.value = true
  replyFeedback.value.rate_id = row.id
  replyFeedback.value.content = ''
}

const sentReply = async () => {
  if (!replyFeedback.value.content) {
    toast.warning(t('hospitalDash.dashboard.replyRequired'))
    return
  }
  dialogOverflowVisible.value = false
  try {
    await axiosInstance.post('/rate-replies', {
      rateId: replyFeedback.value.rate_id,
      content: replyFeedback.value.content
    })
    toast.success(t('hospitalDash.dashboard.replySent'))
  } catch (e) {
    console.log(e)
  }
}

const renderCharts = () => {
  const appointmentBuckets = appointmentStore.monthlyAppointment as { month: string; count: number }[]
  const feedbackBuckets = store.monthlyFeedbacks as { month: string; count: number }[]

  if (appointmentChartEl.value && appointmentBuckets?.length) {
    appointmentChart?.destroy()
    appointmentChart = new Chart(appointmentChartEl.value, {
      type: 'line',
      data: {
        labels: appointmentBuckets.map((b) => formatMonthLabel(b.month)),
        datasets: [
          {
            label: t('hospitalDash.dashboard.appointmentsSeries'),
            data: appointmentBuckets.map((b) => b.count),
            borderColor: '#176B5B',
            backgroundColor: 'rgba(23, 107, 91, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#176B5B',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TOOLTIP_STYLE },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: GRID_STYLE, border: { display: false }, ticks: { precision: 0 } }
        }
      }
    })
  }

  if (feedbackChartEl.value && feedbackBuckets?.length) {
    feedbackChart?.destroy()
    feedbackChart = new Chart(feedbackChartEl.value, {
      type: 'bar',
      data: {
        labels: feedbackBuckets.map((b) => formatMonthLabel(b.month)),
        datasets: [
          {
            label: t('hospitalDash.dashboard.feedbackSeries'),
            data: feedbackBuckets.map((b) => b.count),
            backgroundColor: '#2F7F83',
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TOOLTIP_STYLE },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: GRID_STYLE, border: { display: false }, ticks: { precision: 0 } }
        }
      }
    })
  }
}

const loadDashboard = async () => {
  await Promise.all([
    appointmentStore.fetchAppointmentSummary(),
    store.fetchRecentFeedbacks(userStore.hospital.id),
    store.fetchFeedback(userStore.hospital.id),
    store.fetchMonthlyFeedbacks(userStore.hospital.id),
    appointmentStore.fetchMonthlyAppointment()
  ])
  renderCharts()
}

watch(locale, () => {
  renderCharts()
})

onMounted(() => {
  if (userStore.hospital != 'No hospital') {
    loadDashboard()
  }
})

onBeforeUnmount(() => {
  appointmentChart?.destroy()
  feedbackChart?.destroy()
})
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <template v-if="userStore.hospital != 'No hospital'">
    <SectionHeading :kicker="t('hospitalDash.dashboard.kicker')">
      <template #title>{{ t('nav.dashboard') }}</template>
      <template #subtitle>{{ t('hospitalDash.dashboard.subtitle', { name: userStore.hospital.name }) }}</template>
    </SectionHeading>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TrendStatCard
        :label="t('hospitalDash.dashboard.todayAppointments')"
        :value="appointmentSummary?.today ?? 0"
        :footer-description="t('hospitalDash.dashboard.todayFooter')"
      />
      <TrendStatCard
        :label="t('hospitalDash.dashboard.pendingAppointments')"
        :value="appointmentSummary?.pending ?? 0"
        :footer-description="t('hospitalDash.dashboard.pendingFooter')"
      />
      <TrendStatCard
        :label="t('hospitalDash.dashboard.confirmedAppointments')"
        :value="appointmentSummary?.confirm ?? 0"
        :trend-percent="appointmentTrend"
        :footer-title="appointmentTrendTitle"
        :footer-description="t('hospitalDash.dashboard.confirmedFooter')"
      />
      <TrendStatCard
        :label="t('hospitalDash.dashboard.totalFeedbacks')"
        :value="store.allFeedback.length"
        :trend-percent="feedbackTrend"
        :footer-title="feedbackTrendTitle"
        :footer-description="t('hospitalDash.dashboard.feedbackFooter')"
      />
    </div>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-sm">{{ t('hospitalDash.dashboard.statusBreakdown') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="status in statusBreakdown"
            :key="status.key"
            class="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2"
          >
            <Badge :variant="status.tone">{{ status.label }}</Badge>
            <span class="font-mono text-sm font-semibold text-foreground">{{ status.count }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">{{ t('hospitalDash.dashboard.appointments12') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-64">
            <canvas ref="appointmentChartEl"></canvas>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">{{ t('hospitalDash.dashboard.feedback12') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-64">
            <canvas ref="feedbackChartEl"></canvas>
          </div>
        </CardContent>
      </Card>
    </div>

    <section class="mt-10">
      <div class="flex items-center justify-between">
        <SectionHeading :kicker="t('hospitalDash.dashboard.latest')">
          <template #title>{{ t('hospitalDash.dashboard.recentFeedback') }}</template>
        </SectionHeading>
        <Input v-model="search" :placeholder="t('hospitalDash.dashboard.searchPlaceholder')" class="w-64" />
      </div>
      <Card class="mt-6">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('hospitalDash.dashboard.sentBy') }}</TableHead>
                <TableHead>{{ t('hospitalDash.dashboard.content') }}</TableHead>
                <TableHead>{{ t('hospitalDash.dashboard.stars') }}</TableHead>
                <TableHead class="text-right">{{ t('hospitalDash.appointments.action') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in filterTableData" :key="row.id">
                <TableCell>
                  <div class="flex items-center gap-3">
                    <Avatar class="size-8">
                      <AvatarImage :src="row.user?.profile" />
                      <AvatarFallback>{{ row.user?.name?.charAt(0) }}</AvatarFallback>
                    </Avatar>
                    {{ row.user?.name }}
                  </div>
                </TableCell>
                <TableCell>{{ row.content }}</TableCell>
                <TableCell><StarRating :model-value="row.star" readonly /></TableCell>
                <TableCell class="text-right">
                  <Button variant="ghost" size="icon" @click="handleEdit(row)">
                    <MessageSquareIcon class="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-if="!filterTableData.length" class="p-6 text-center text-sm text-muted-foreground">
            {{ t('hospitalDash.feedback.empty') }}
          </p>
        </CardContent>
      </Card>
    </section>

    <Dialog v-model:open="dialogOverflowVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.feedback.replyTitle') }}</DialogTitle>
        </DialogHeader>
        <Input v-model="replyFeedback.content" :placeholder="t('hospitalDash.dashboard.replyPlaceholder')" />
        <DialogFooter>
          <Button variant="outline" @click="dialogOverflowVisible = false">{{ t('hospitalDash.cancel') }}</Button>
          <Button @click="sentReply">{{ t('hospitalDash.appointments.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </template>
    <NoHospitalSet v-else />
  </DashboardLayout>
</template>
