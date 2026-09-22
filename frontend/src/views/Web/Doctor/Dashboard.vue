<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Chart from 'chart.js/auto'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { doctorNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import TrendStatCard from '@/components/ui/trend-stat-card.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import axiosInstance from '@/plugins/axios'
import AppointmentStatusBadge from '@/components/appointment/appointment-status-badge.vue'
import { formatAppointmentDate, formatAppointmentTime } from '@/lib/format'

const { t, locale } = useI18n()
const appointmentStore = hospitalAppointmentListStore()

const centerDialogVisible = ref(false)
const appointmentToday = ref<any[]>([])
const appointmentSummary = ref<Record<string, number>>({})
const selectedAppointment = ref<any>(null)
const chartEl = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const formatMonthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-US', {
    month: 'short',
    timeZone: 'UTC'
  })

const fetchAppointmentsToday = async () => {
  try {
    const { data } = await axiosInstance.get('/appointments/today')
    appointmentToday.value = data
  } catch (error) {
    console.error('Error fetching appointments for today:', error)
  }
}

const fetchAppointmentSummary = async () => {
  try {
    const { data } = await axiosInstance.get('/appointments/summary')
    appointmentSummary.value = data
  } catch (error) {
    console.error('Error fetching appointment summary:', error)
  }
}

const showDetails = (row: any) => {
  centerDialogVisible.value = true
  selectedAppointment.value = row
}

// Real month-over-month delta from the same 12-month bucket data the chart
// below already uses - not a fabricated trend number. `undefined` when
// there's no prior-month count to compare against.
const appointmentTrend = computed(() => {
  const buckets = appointmentStore.monthlyAppointment as { month: string; count: number }[]
  if (!buckets || buckets.length < 2) return undefined
  const current = buckets[buckets.length - 1].count
  const previous = buckets[buckets.length - 2].count
  if (previous === 0) return undefined
  return ((current - previous) / previous) * 100
})

const renderChart = () => {
  const buckets = appointmentStore.monthlyAppointment as { month: string; count: number }[]
  if (!chartEl.value || !buckets?.length) return

  chart?.destroy()
  chart = new Chart(chartEl.value, {
    type: 'line',
    data: {
      labels: buckets.map((b) => formatMonthLabel(b.month)),
      datasets: [
        {
          label: t('doctorDash.dashboard.appointmentsSeries'),
          data: buckets.map((b) => b.count),
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#17201D',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          padding: 10,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
          border: { display: false },
          ticks: { precision: 0 }
        }
      }
    }
  })
}

const appointmentTrendTitle = computed(() =>
  appointmentTrend.value !== undefined
    ? t(appointmentTrend.value >= 0 ? 'doctorDash.dashboard.trendUp' : 'doctorDash.dashboard.trendDown', {
        percent: Math.abs(appointmentTrend.value).toFixed(0)
      })
    : undefined
)

watch(locale, () => {
  renderChart()
})

onMounted(async () => {
  await Promise.all([fetchAppointmentsToday(), fetchAppointmentSummary(), appointmentStore.fetchMonthlyAppointment()])
  renderChart()
})

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>
<template>
  <DashboardLayout :nav-items="doctorNavItems" :portal-label="t('doctorDash.portal')">
    <Dialog v-model:open="centerDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('doctorDash.dashboard.detailTitle') }}</DialogTitle>
        </DialogHeader>
        <dl v-if="selectedAppointment" class="space-y-2 text-sm text-muted-foreground">
          <p><b class="text-foreground">{{ t('doctorDash.dashboard.patientLabel') }}</b> {{ selectedAppointment.user?.first_name }} {{ selectedAppointment.user?.last_name }}</p>
          <p><b class="text-foreground">{{ t('doctorDash.dashboard.dateLabel') }}</b> {{ formatAppointmentDate(selectedAppointment.appointment_date) }}</p>
          <p><b class="text-foreground">{{ t('doctorDash.dashboard.statusLabel') }}</b> {{ selectedAppointment.status }}</p>
          <p><b class="text-foreground">{{ t('doctorDash.dashboard.responseLabel') }}</b> {{ selectedAppointment.doctor_status }}</p>
        </dl>
        <DialogFooter>
          <Button @click="centerDialogVisible = false">{{ t('doctorDash.dashboard.close') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <SectionHeading :kicker="t('doctorDash.dashboard.kicker')">
      <template #title>{{ t('nav.dashboard') }}</template>
      <template #subtitle>{{ t('doctorDash.dashboard.subtitle') }}</template>
    </SectionHeading>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <TrendStatCard
        :label="t('doctorDash.dashboard.todayAppointments')"
        :value="appointmentSummary.today ?? 0"
        :footer-description="t('doctorDash.dashboard.todayFooter')"
      />
      <TrendStatCard
        :label="t('doctorDash.dashboard.confirmed')"
        :value="appointmentSummary.confirm ?? 0"
        :trend-percent="appointmentTrend"
        :footer-title="appointmentTrendTitle"
        :footer-description="t('doctorDash.dashboard.confirmedFooter')"
      />
      <TrendStatCard :label="t('doctorDash.dashboard.missed')" :value="appointmentSummary.missing ?? 0" :footer-description="t('doctorDash.dashboard.missedFooter')" />
    </div>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-sm">{{ t('doctorDash.dashboard.appointments12') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="h-64">
          <canvas ref="chartEl"></canvas>
        </div>
      </CardContent>
    </Card>

    <section class="mt-10">
      <SectionHeading :kicker="t('doctorDash.dashboard.todayKicker')">
        <template #title>{{ t('doctorDash.dashboard.todayAppointments') }}</template>
      </SectionHeading>
      <Card class="mt-6">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('doctorDash.dashboard.patient') }}</TableHead>
                <TableHead>{{ t('doctorDash.dashboard.time') }}</TableHead>
                <TableHead>{{ t('doctorDash.dashboard.status') }}</TableHead>
                <TableHead>{{ t('doctorDash.dashboard.myResponse') }}</TableHead>
                <TableHead class="text-right">{{ t('doctorDash.dashboard.action') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in appointmentToday" :key="row.id">
                <TableCell>{{ row.user?.first_name }} {{ row.user?.last_name }}</TableCell>
                <TableCell>{{ formatAppointmentTime(row.appointment_time) }}</TableCell>
                <TableCell>
                  <AppointmentStatusBadge :status="row.status" />
                </TableCell>
                <TableCell>{{ row.doctor_status }}</TableCell>
                <TableCell class="text-right">
                  <Button variant="outline" size="sm" @click="showDetails(row)">{{ t('doctorDash.dashboard.detail') }}</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-if="!appointmentToday.length" class="p-6 text-center text-sm text-muted-foreground">
            {{ t('doctorDash.dashboard.empty') }}
          </p>
        </CardContent>
      </Card>
    </section>
  </DashboardLayout>
</template>
