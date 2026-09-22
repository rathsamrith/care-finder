<script setup lang="ts">
import { CheckCheckIcon, MapPinCheckIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import AppointmentStatusBadge from '@/components/appointment/appointment-status-badge.vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { doctorNavItems, hospitalNavItems } from '@/components/layouts/dashboard-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'
import { socketConstance } from '@/plugins/socket'
import { useAuthStore } from '@/stores/auth-store'

// Today's working list for reception (hospital accounts) and doctors: who is
// waiting in check-in order, who is still expected, who is done. Reception can
// check patients in by hand and either of them can complete a visit.
const { t } = useI18n()
const auth = useAuthStore()
const isDoctor = computed(() => (auth.roles ?? []).includes('doctor') && !(auth.roles ?? []).includes('hospital'))
const nav = computed(() => (isDoctor.value ? doctorNavItems : hospitalNavItems))
const portal = computed(() => (isDoctor.value ? 'doctorDash.portal' : 'hospitalDash.portal'))

interface Item {
  id: number | string
  status: string
  queue_label: string | null
  appointment_time: string
  title: string
  room?: { name: string } | null
  doctor?: { first_name?: string; last_name?: string } | null
  user?: { first_name?: string; last_name?: string; name?: string } | null
  checked_in_at?: string | null
}
interface Queue {
  date: string
  counts: { waiting: number; expected: number; completed: number; missing: number }
  items: Item[]
}

const queue = ref<Queue | null>(null)
const loading = ref(true)
const error = ref('')
const acting = ref<string | number | null>(null)

const load = async () => {
  try {
    const { data } = await axiosInstance.get<Queue>('/appointments/queue')
    queue.value = data
    error.value = ''
  } catch (e) {
    error.value = apiErrorMessage(e, t('queue.loadFailed'))
  } finally {
    loading.value = false
  }
}

const patientName = (i: Item) => i.user?.name || `${i.user?.first_name ?? ''} ${i.user?.last_name ?? ''}`.trim()
const doctorName = (i: Item) => `${i.doctor?.first_name ?? ''} ${i.doctor?.last_name ?? ''}`.trim()
const hhmm = (time: string) => String(time).slice(11, 16)

const act = async (item: Item, action: 'arrive' | 'complete') => {
  acting.value = item.id
  try {
    if (action === 'arrive') await axiosInstance.post(`/appointments/${item.id}/arrive`)
    else await axiosInstance.put(`/appointments/${item.id}/complete`)
    toast.success(t(action === 'arrive' ? 'queue.checkedIn' : 'queue.completed'))
    await load()
  } catch (e) {
    toast.error(apiErrorMessage(e, t('queue.actionFailed')))
  } finally {
    acting.value = null
  }
}

const canCheckIn = (i: Item) => i.status === 'Confirmed' || i.status === 'Missing'
// Reception checks people in; the doctor only works the queue.
const showCheckIn = (i: Item) => !isDoctor.value && canCheckIn(i)
const canComplete = (i: Item) => i.status === 'Arrived'

// Stay current: poll, and refresh at once when a check-in/status event arrives.
let poll: ReturnType<typeof setInterval> | null = null
const refresh = () => void load()
onMounted(() => {
  void load()
  poll = setInterval(refresh, 15_000)
  socketConstance.on('notify', refresh)
  socketConstance.on('appointment-status-changed', refresh)
})
onBeforeUnmount(() => {
  if (poll) clearInterval(poll)
  socketConstance.off('notify', refresh)
  socketConstance.off('appointment-status-changed', refresh)
})

const stats = computed(() => [
  { key: 'waiting', value: queue.value?.counts.waiting ?? 0 },
  { key: 'expected', value: queue.value?.counts.expected ?? 0 },
  { key: 'completed', value: queue.value?.counts.completed ?? 0 },
  { key: 'missing', value: queue.value?.counts.missing ?? 0 }
])
</script>

<template>
  <DashboardLayout :nav-items="nav" :portal-label="t(portal)">
    <SectionHeading :kicker="t('queue.kicker')">
      <template #title>{{ t('queue.title') }}</template>
    </SectionHeading>

    <p v-if="error" role="alert" class="mt-4 rounded-lg bg-danger-light p-3 text-sm text-danger">{{ error }}</p>

    <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card v-for="s in stats" :key="s.key">
        <CardContent>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t(`queue.stats.${s.key}`) }}</p>
          <p class="mt-1 text-3xl font-semibold text-ink" :data-testid="`stat-${s.key}`">{{ s.value }}</p>
        </CardContent>
      </Card>
    </div>

    <Card class="mt-6">
      <CardContent class="p-0">
        <p v-if="loading" class="p-6 text-sm text-slate-500">{{ t('site.loading') }}</p>
        <p v-else-if="!queue?.items.length" class="p-6 text-center text-sm text-slate-500">{{ t('queue.empty') }}</p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead class="w-24">{{ t('queue.columns.queue') }}</TableHead>
              <TableHead>{{ t('queue.columns.patient') }}</TableHead>
              <TableHead>{{ t('queue.columns.time') }}</TableHead>
              <TableHead>{{ t('queue.columns.doctor') }}</TableHead>
              <TableHead>{{ t('queue.columns.room') }}</TableHead>
              <TableHead>{{ t('queue.columns.status') }}</TableHead>
              <TableHead class="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in queue.items" :key="item.id" :data-status="item.status">
              <TableCell class="font-mono text-lg font-bold text-accent-dark">{{ item.queue_label ?? '—' }}</TableCell>
              <TableCell>
                <p class="font-medium text-ink">{{ patientName(item) }}</p>
                <p class="text-xs text-slate-500">{{ item.title }}</p>
              </TableCell>
              <TableCell>{{ hhmm(item.appointment_time) }}</TableCell>
              <TableCell>{{ doctorName(item) }}</TableCell>
              <TableCell>{{ item.room?.name ?? '—' }}</TableCell>
              <TableCell><AppointmentStatusBadge :status="item.status" /></TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button v-if="showCheckIn(item)" size="sm" variant="outline" :disabled="acting === item.id" @click="act(item, 'arrive')">
                    <MapPinCheckIcon />{{ t('queue.checkIn') }}
                  </Button>
                  <Button v-if="canComplete(item)" size="sm" :disabled="acting === item.id" @click="act(item, 'complete')">
                    <CheckCheckIcon />{{ t('queue.complete') }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </DashboardLayout>
</template>
