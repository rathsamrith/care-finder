<script setup lang="ts">
import Chart from 'chart.js/auto'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { adminNavItems } from '@/components/layouts/dashboard-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionHeading from '@/components/ui/section-heading.vue'
import TrendStatCard from '@/components/ui/trend-stat-card.vue'
import { Badge } from '@/components/ui/badge'
import axiosInstance from '@/plugins/axios'

type SystemRequest = {
  id: number | string
  requestDetails: string
  requestStatus: 'pending' | 'approved'
  category?: { name: string }
  user?: { name?: string; email?: string }
}

const { t, locale } = useI18n()

const loading = ref(true)
const hospitalCount = ref(0)
const doctorCount = ref(0)
const categoryCount = ref(0)
const pendingRequestCount = ref(0)
const recentPendingRequests = ref<SystemRequest[]>([])

const categoryChartEl = ref<HTMLCanvasElement | null>(null)
let categoryChart: Chart | null = null
let chartHospitals: { category?: { name: string } }[] = []

const renderCategoryChart = (hospitals: { category?: { name: string } }[]) => {
  if (!categoryChartEl.value) return

  const counts = new Map<string, number>()
  for (const hospital of hospitals) {
    const name = hospital.category?.name ?? t('misc.admin.uncategorized')
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])

  categoryChart?.destroy()
  categoryChart = new Chart(categoryChartEl.value, {
    type: 'bar',
    data: {
      labels: entries.map(([name]) => name),
      datasets: [
        {
          label: t('misc.admin.hospitals'),
          data: entries.map(([, count]) => count),
          backgroundColor: '#176B5B',
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          maxBarThickness: 32
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: entries.length > 6 ? 'y' : 'x',
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
        x: { grid: { display: false }, border: { display: false }, ticks: { precision: 0 } },
        y: { grid: { color: 'rgba(148, 163, 184, 0.15)' }, border: { display: false }, ticks: { precision: 0 } }
      }
    }
  })
}

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const [{ data: hospitals }, { data: doctors }, { data: categories }, { data: requests }] = await Promise.all([
      axiosInstance.get('/hospitals'),
      axiosInstance.get('/doctors'),
      axiosInstance.get('/categories'),
      axiosInstance.get('/system-requests')
    ])
    hospitalCount.value = hospitals.length
    doctorCount.value = doctors.length
    categoryCount.value = categories.length
    pendingRequestCount.value = requests.filter((r: SystemRequest) => r.requestStatus === 'pending').length
    recentPendingRequests.value = requests
      .filter((r: SystemRequest) => r.requestStatus === 'pending')
      .slice(0, 5)
    chartHospitals = hospitals
    renderCategoryChart(hospitals)
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

watch(locale, () => renderCategoryChart(chartHospitals))

onBeforeUnmount(() => {
  categoryChart?.destroy()
})
</script>

<template>
  <DashboardLayout :nav-items="adminNavItems" :portal-label="t('misc.admin.portal')" :with-notifications="false">
    <SectionHeading :kicker="t('misc.admin.portal')">
      <template #title>{{ t('misc.admin.overview') }}</template>
      <template #subtitle>{{ t('misc.admin.overviewSubtitle') }}</template>
    </SectionHeading>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TrendStatCard :label="t('misc.admin.hospitals')" :value="loading ? '—' : hospitalCount" :footer-description="t('misc.admin.hospitalsFooter')" />
      <TrendStatCard :label="t('misc.admin.doctors')" :value="loading ? '—' : doctorCount" :footer-description="t('misc.admin.doctorsFooter')" />
      <TrendStatCard :label="t('misc.admin.categories')" :value="loading ? '—' : categoryCount" :footer-description="t('misc.admin.categoriesFooter')" />
      <TrendStatCard :label="t('misc.admin.pendingRequests')" :value="loading ? '—' : pendingRequestCount" :footer-description="t('misc.admin.pendingFooter')" />
    </div>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-sm">{{ t('misc.admin.byCategory') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="h-64">
          <canvas ref="categoryChartEl"></canvas>
        </div>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-sm">{{ t('misc.admin.recentPending') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="recentPendingRequests.length" class="space-y-3">
          <div
            v-for="request in recentPendingRequests"
            :key="request.id"
            class="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ request.category?.name || t('misc.admin.uncategorized') }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ request.requestDetails }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ request.user?.name || request.user?.email }}</p>
            </div>
            <Badge variant="warning">{{ t('misc.admin.pending') }}</Badge>
          </div>
        </div>
        <p v-else-if="!loading" class="text-sm text-slate-500">{{ t('misc.admin.noPending') }}</p>
      </CardContent>
    </Card>
  </DashboardLayout>
</template>
