<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import TicketCard, { type Ticket } from '@/components/checkin/ticket-card.vue'
import LanguageSwitcher from '@/components/language-switcher.vue'
import { useQrScanner } from '@/composables/use-qr-scanner'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'

// Full-screen page for the check-in tablet at the hospital. The tablet is paired
// once with its device key (created on the hospital's Kiosks page), which stays in
// this browser; no account is involved. After a check-in the ticket is shown for a
// few seconds and then cleared, because the screen is in public.
const { t } = useI18n()

const STORAGE_KEY = 'kiosk_key'
const TICKET_SECONDS = 15
const ERROR_SECONDS = 7

interface KioskInfo {
  name: string
  prefix: string
  hospital: { id: number | string; name: string }
}

const deviceKey = ref('')
const info = ref<KioskInfo | null>(null)
const phase = ref<'loading' | 'pairing' | 'ready'>('loading')
const pairInput = ref('')
const pairing = ref(false)
const pairError = ref('')

const ticket = ref<Ticket | null>(null)
const message = ref('')
const countdown = ref(0)
const manualCode = ref('')
const submitting = ref(false)
let resetTimer: ReturnType<typeof setInterval> | null = null

const video = ref<HTMLVideoElement | null>(null)
const busy = computed(() => submitting.value || ticket.value !== null)

const headers = () => ({ 'X-Kiosk-Key': deviceKey.value })

const loadKiosk = async (key: string) => {
  const { data } = await axiosInstance.get<KioskInfo>('/kiosk/me', { headers: { 'X-Kiosk-Key': key } })
  return data
}

onMounted(async () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: pair each time */
  }
  if (!stored) {
    phase.value = 'pairing'
    return
  }
  try {
    info.value = await loadKiosk(stored)
    deviceKey.value = stored
    phase.value = 'ready'
  } catch (e) {
    // A revoked/unknown key: start over. Any other failure (network down) keeps the key.
    const status = (e as { response?: { status?: number } }).response?.status
    if (status === 401) unpair(false)
    else {
      deviceKey.value = stored
      phase.value = 'ready'
      message.value = t('kiosk.offline')
    }
  }
})

const pair = async () => {
  pairError.value = ''
  pairing.value = true
  const key = pairInput.value.trim()
  try {
    info.value = await loadKiosk(key)
    deviceKey.value = key
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      /* works for this session only */
    }
    pairInput.value = ''
    phase.value = 'ready'
  } catch (e) {
    pairError.value = (e as { response?: { status?: number } }).response?.status === 401 ? t('kiosk.pairInvalid') : apiErrorMessage(e, t('kiosk.pairFailed'))
  } finally {
    pairing.value = false
  }
}

function unpair(confirmFirst = true) {
  if (confirmFirst && !window.confirm(t('kiosk.confirmUnpair'))) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  scanner.stop()
  deviceKey.value = ''
  info.value = null
  phase.value = 'pairing'
}

const clearTimer = () => {
  if (resetTimer) clearInterval(resetTimer)
  resetTimer = null
}

// Show something for N seconds, then go back to waiting for the next patient.
const showThenReset = (seconds: number) => {
  clearTimer()
  countdown.value = seconds
  resetTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
      ticket.value = null
      message.value = ''
    }
  }, 1000)
}

const submitCode = async (code: string) => {
  const clean = code.trim()
  if (!clean || busy.value || phase.value !== 'ready') return
  submitting.value = true
  message.value = ''
  try {
    const { data } = await axiosInstance.post<Ticket>('/kiosk/check-in', { code: clean }, { headers: headers() })
    ticket.value = data
    manualCode.value = ''
    showThenReset(TICKET_SECONDS)
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status
    if (status === 401) return unpair(false) // key revoked while running
    message.value = apiErrorMessage(e, t('kiosk.failed'))
    showThenReset(ERROR_SECONDS)
  } finally {
    submitting.value = false
  }
}

const scanner = useQrScanner(video, (code) => void submitCode(code))

// Start the camera once the page is ready and the <video> exists.
watch(phase, async (p) => {
  if (p === 'ready') {
    await nextTick()
    await scanner.start()
  }
})

onBeforeUnmount(clearTimer)
</script>

<template>
  <main class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p class="text-xl font-bold text-ink">{{ info?.hospital.name ?? 'Care Finder' }}</p>
        <p v-if="info" class="text-sm text-slate-500">{{ t('kiosk.selfCheckIn') }} · {{ info.name }} ({{ info.prefix }})</p>
      </div>
      <LanguageSwitcher />
    </header>

    <p v-if="phase === 'loading'" class="m-auto text-lg text-slate-500">{{ t('site.loading') }}</p>

    <!-- Pair this tablet -->
    <section v-else-if="phase === 'pairing'" class="m-auto w-full max-w-md px-6 py-10">
      <h1 class="text-2xl font-semibold text-ink">{{ t('kiosk.pairTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('kiosk.pairHelp') }}</p>
      <form class="mt-6 space-y-3" @submit.prevent="pair">
        <label for="kiosk-key" class="text-sm font-semibold text-ink">{{ t('kiosk.keyLabel') }}</label>
        <input
          id="kiosk-key"
          v-model="pairInput"
          type="password"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('kiosk.keyPlaceholder')"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <p v-if="pairError" role="alert" class="rounded-lg bg-danger-light p-3 text-sm text-danger">{{ pairError }}</p>
        <button
          type="submit"
          :disabled="pairing || !pairInput.trim()"
          class="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {{ pairing ? t('kiosk.connecting') : t('kiosk.connect') }}
        </button>
      </form>
    </section>

    <!-- Ready: scan or type, or show the ticket -->
    <section v-else class="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-6 py-8 lg:grid-cols-2">
      <div v-if="ticket" class="lg:col-span-2">
        <TicketCard :ticket="ticket" large />
        <p class="mt-6 text-center text-slate-500">{{ t('kiosk.nextIn', { n: countdown }) }}</p>
      </div>

      <template v-else>
        <div>
          <h1 class="text-3xl font-semibold text-ink">{{ t('kiosk.scanTitle') }}</h1>
          <p class="mt-2 text-lg text-slate-600">{{ t('kiosk.scanHelp') }}</p>
          <div class="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
            <video ref="video" class="size-full object-cover" muted playsinline />
            <div v-if="scanner.failure.value" class="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
              {{ scanner.failure.value === 'blocked' ? t('kiosk.cameraBlocked') : t('kiosk.cameraUnsupported') }}
            </div>
          </div>
        </div>

        <div class="lg:pt-16">
          <h2 class="text-2xl font-semibold text-ink">{{ t('kiosk.manualTitle') }}</h2>
          <form class="mt-4 space-y-3" @submit.prevent="submitCode(manualCode)">
            <label for="kiosk-code" class="text-lg text-slate-600">{{ t('kiosk.codeLabel') }}</label>
            <input
              id="kiosk-code"
              v-model="manualCode"
              type="text"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              :placeholder="t('kiosk.codePlaceholder')"
              class="w-full rounded-xl border border-slate-300 px-5 py-4 font-mono text-2xl uppercase tracking-wider outline-none focus:border-accent"
            />
            <button
              type="submit"
              :disabled="busy || !manualCode.trim()"
              class="w-full rounded-xl bg-accent px-6 py-4 text-xl font-semibold text-white disabled:opacity-60"
            >
              {{ submitting ? t('kiosk.checking') : t('kiosk.submit') }}
            </button>
          </form>
          <p v-if="message" role="alert" class="mt-5 rounded-xl bg-danger-light p-4 text-lg text-danger">{{ message }}</p>
        </div>
      </template>
    </section>

    <footer v-if="phase === 'ready'" class="border-t border-slate-200 bg-white px-6 py-3 text-right">
      <button type="button" class="text-xs text-slate-400 hover:text-slate-600" @click="unpair()">{{ t('kiosk.unpair') }}</button>
    </footer>
  </main>
</template>
