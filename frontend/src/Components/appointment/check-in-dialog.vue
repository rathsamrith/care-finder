<script setup lang="ts">
import { CalendarPlusIcon, CheckCircle2Icon, ClockIcon, MapPinCheckIcon, PrinterIcon, QrCodeIcon, UserIcon } from '@lucide/vue'
import QRCode from 'qrcode'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import TicketCard, { type Ticket } from '@/components/checkin/ticket-card.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/api-error'
import { getPosition, LocationError } from '@/lib/geolocation'
import { buildIcs, downloadIcs } from '@/lib/ics'
import axiosInstance from '@/plugins/axios'

// The patient's digital pass for an appointment: the details, the check-in code
// (QR + text) to scan at a kiosk, what to do on arrival, and - once inside the
// window - "I'm here" from their own phone. Also "Add to calendar" and a printable
// version ("Save as PDF" in the browser's print dialog).
const props = defineProps<{ open: boolean; appointmentId: number | string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; checkedIn: [] }>()
const { t, locale } = useI18n()

interface PassAppointment {
  reference: string
  title: string
  patientName: string | null
  hospital: string
  hospitalAddress: string | null
  doctor: string | null
  room: string | null
  date: string
  time: string
  endTime: string | null
  arriveBy: string
}
interface CodeInfo {
  code: string
  status: string
  window: 'early' | 'open' | 'late'
  opensAt: string
  closesAt: string
  ticket: Ticket | null
  appointment?: PassAppointment
}

const info = ref<CodeInfo | null>(null)
const ticket = ref<Ticket | null>(null)
const qr = ref('')
const loading = ref(false)
const busy = ref<'' | 'locating' | 'sending'>('')
const error = ref('')

const load = async () => {
  if (!props.appointmentId) return
  loading.value = true
  error.value = ''
  info.value = null
  ticket.value = null
  qr.value = ''
  try {
    const { data } = await axiosInstance.get<CodeInfo>(`/appointments/${props.appointmentId}/check-in-code`)
    info.value = data
    ticket.value = data.ticket
    // The QR carries just the code text; the kiosk checks it with the server.
    qr.value = await QRCode.toDataURL(data.code, { margin: 1, width: 240 })
  } catch (e) {
    error.value = apiErrorMessage(e, t('checkin.loadFailed'))
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.appointmentId], () => props.open && load(), { immediate: true })

const appt = computed(() => info.value?.appointment)
const confirmed = computed(() => info.value?.status === 'Confirmed')
const checkedIn = computed(() => ticket.value !== null)
const windowMessage = computed(() => {
  if (!info.value) return ''
  if (info.value.window === 'early') return t('checkin.opensAt', { time: info.value.opensAt })
  if (info.value.window === 'late') return t('checkin.closedAt', { time: info.value.closesAt })
  return t('checkin.window', { from: info.value.opensAt, to: info.value.closesAt })
})
const canCheckIn = computed(() => confirmed.value && info.value?.window === 'open' && !busy.value)

const whenText = computed(() => {
  if (!appt.value) return ''
  // The date is a plain calendar day; format it as UTC so it never shifts with the viewer's timezone.
  const day = new Date(`${appt.value.date}T00:00:00Z`).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  })
  return `${day} · ${appt.value.time}${appt.value.endTime ? ` - ${appt.value.endTime}` : ''}`
})

const checkInFromPhone = async () => {
  error.value = ''
  try {
    busy.value = 'locating'
    const position = await getPosition()
    busy.value = 'sending'
    const { data } = await axiosInstance.post<Ticket>(`/appointments/${props.appointmentId}/check-in`, position)
    ticket.value = data
    emit('checkedIn')
  } catch (e) {
    error.value =
      e instanceof LocationError
        ? t(e.reason === 'unsupported' ? 'checkin.locationUnsupported' : 'checkin.locationDenied')
        : apiErrorMessage(e, t('checkin.failed'))
  } finally {
    busy.value = ''
  }
}

const addToCalendar = () => {
  const a = appt.value
  if (!a || !info.value) return
  const ics = buildIcs({
    uid: a.reference,
    title: t('checkin.pass.calendarTitle', { title: a.title, hospital: a.hospital }),
    date: a.date,
    start: a.time,
    end: a.endTime,
    location: [a.hospital, a.hospitalAddress].filter(Boolean).join(', '),
    description: [a.doctor && `${t('checkin.pass.doctor')}: ${a.doctor}`, a.room && `${t('checkin.ticket.room')}: ${a.room}`, `${t('checkin.yourCode')}: ${info.value.code}`]
      .filter(Boolean)
      .join('\n')
  })
  downloadIcs(`${a.reference}.ics`, ics)
}

const print = () => window.print()
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-h-[92vh] overflow-y-auto p-0 sm:max-w-lg">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ t('checkin.title') }}</DialogTitle>
        <DialogDescription>{{ windowMessage }}</DialogDescription>
      </DialogHeader>

      <div class="print-pass">
        <!-- Banner -->
        <div class="flex items-center gap-3 bg-accent px-5 py-4 text-white">
          <CheckCircle2Icon class="size-8 shrink-0" />
          <div>
            <p class="text-lg font-semibold" data-testid="banner">
              {{ checkedIn ? t('checkin.pass.checkedIn') : confirmed ? t('checkin.pass.confirmed') : t('checkin.title') }}
            </p>
            <p v-if="appt" class="text-sm text-white/80">{{ t('checkin.pass.reference', { ref: appt.reference }) }}</p>
          </div>
        </div>

        <div class="space-y-4 p-5">
          <p v-if="loading" class="text-sm text-slate-500">{{ t('site.loading') }}</p>

          <template v-else-if="info">
            <p v-if="!confirmed && !checkedIn" class="rounded-lg bg-warning-light p-3 text-sm text-warning-dark">{{ t('checkin.notConfirmed') }}</p>

            <!-- Appointment details -->
            <dl v-if="appt" class="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 text-sm" data-testid="details">
              <div>
                <dt class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><UserIcon class="size-3.5" />{{ t('checkin.pass.patient') }}</dt>
                <dd class="mt-0.5 font-semibold text-ink">{{ appt.patientName }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('checkin.pass.doctor') }}</dt>
                <dd class="mt-0.5 font-semibold text-ink">{{ appt.doctor }}</dd>
                <dd class="text-xs text-slate-500">{{ appt.room || t('checkin.ticket.noRoom') }}</dd>
              </div>
              <div class="col-span-2 border-t border-slate-100 pt-3">
                <dt class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><ClockIcon class="size-3.5" />{{ t('checkin.pass.when') }}</dt>
                <dd class="mt-0.5 font-semibold text-ink">{{ whenText }}</dd>
                <dd class="text-xs text-slate-500">{{ appt.hospital }}<template v-if="appt.hospitalAddress"> · {{ appt.hospitalAddress }}</template></dd>
              </div>
            </dl>

            <!-- Checked in: the queue ticket -->
            <div v-if="ticket" class="rounded-xl border border-dashed border-accent/40 p-4">
              <TicketCard :ticket="ticket" />
            </div>

            <!-- Not yet checked in: the code to scan -->
            <section v-else-if="confirmed" class="rounded-xl border border-dashed border-accent/40 p-4 text-center">
              <h3 class="flex items-center justify-center gap-1.5 text-sm font-semibold text-ink"><QrCodeIcon class="size-4" />{{ t('checkin.atKiosk') }}</h3>
              <p class="mt-1 text-xs text-slate-500">{{ t('checkin.atKioskHelp') }}</p>
              <img v-if="qr" :src="qr" :alt="t('checkin.yourCode')" class="mx-auto mt-3 size-44 rounded-lg border border-slate-200 bg-white" />
              <p class="mt-2 text-xs text-slate-500">{{ t('checkin.yourCode') }}</p>
              <p class="font-mono text-2xl font-bold tracking-wider text-ink" data-testid="code">{{ info.code }}</p>
            </section>

            <!-- What to do -->
            <ul v-if="appt && !checkedIn && confirmed" class="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700" data-testid="checklist">
              <li class="flex gap-2"><ClockIcon class="mt-0.5 size-4 shrink-0 text-accent" />{{ t('checkin.pass.arriveBy', { time: appt.arriveBy }) }}</li>
              <li class="flex gap-2"><QrCodeIcon class="mt-0.5 size-4 shrink-0 text-accent" />{{ t('checkin.pass.keepCode') }}</li>
              <li class="flex gap-2"><MapPinCheckIcon class="mt-0.5 size-4 shrink-0 text-accent" />{{ t('checkin.pass.howToCheckIn') }}</li>
            </ul>

            <!-- From the phone (not in the printout) -->
            <section v-if="confirmed && !ticket" class="border-t border-slate-200 pt-4 print:hidden">
              <p class="text-sm text-slate-600">{{ windowMessage }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ t('checkin.fromPhoneHelp') }}</p>
              <Button class="mt-3 w-full" :disabled="!canCheckIn" @click="checkInFromPhone">
                <MapPinCheckIcon />
                {{ busy === 'locating' ? t('checkin.locating') : busy === 'sending' ? t('checkin.sending') : t('checkin.useLocation') }}
              </Button>
            </section>
          </template>

          <p v-if="error" role="alert" class="rounded-lg bg-danger-light p-3 text-sm text-danger print:hidden">{{ error }}</p>

          <!-- Actions (not in the printout) -->
          <div v-if="appt" class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 print:hidden">
            <Button variant="outline" size="sm" @click="addToCalendar"><CalendarPlusIcon />{{ t('checkin.pass.addToCalendar') }}</Button>
            <Button variant="outline" size="sm" @click="print"><PrinterIcon />{{ t('checkin.pass.savePdf') }}</Button>
            <Button class="ml-auto" size="sm" @click="emit('update:open', false)">{{ t('checkin.pass.done') }}</Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
