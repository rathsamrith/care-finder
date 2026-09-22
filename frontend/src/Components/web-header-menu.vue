<script setup lang="ts">
import { BellIcon, LogOutIcon, MenuIcon } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import LanguageSwitcher from '@/components/language-switcher.vue'

import { socketConstance } from '@/plugins/socket'
import { useAuthStore } from '@/stores/auth-store'
import { clearActiveHospitalId } from '@/lib/active-hospital'
import { FeedbackList } from '@/stores/feedback-list'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { NotificationStore } from '@/stores/notification-store'

type NavItem = {
  label: string // i18n key
  to: string
}

type HeaderNotification = {
  id: number | string
  from?: string
  message?: string
  created_at?: string
  user?: {
    first_name?: string
    fist_name?: string
  }
}

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const store = useAuthStore()
const notifyStore = NotificationStore()
const appointmentStore = hospitalAppointmentListStore()
const feedbackStore = FeedbackList()

const mobileMenuOpen = ref(false)
const notificationOpen = ref(false)
const profileOpen = ref(false)

const currentRole = computed(() =>
  Array.isArray(store.roles) && store.roles.length > 0 ? store.roles[0] : null
)
const isLoggedIn = computed(() => Boolean(store.user))
const unseenCount = computed(() => notifyStore.unseenNotifications.length)
const displayName = computed(() =>
  store.user ? `${store.user.first_name ?? ''} ${store.user.last_name ?? ''}`.trim() : t('common.guest')
)
const userInitials = computed(() => {
  const first = store.user?.first_name?.[0] ?? 'C'
  const last = store.user?.last_name?.[0] ?? 'F'

  return `${first}${last}`.toUpperCase()
})
const profileRoute = computed(() => '/profile')

const navMap: Record<string, NavItem[]> = {
  guest: [
    { label: 'nav.home', to: '/landing' },
    { label: 'nav.exploreHospitals', to: '/explore' },
    { label: 'nav.nearby', to: '/nearby' },
    { label: 'nav.about', to: '/about' },
    { label: 'nav.contact', to: '/contact' }
  ],
  user: [
    { label: 'nav.discover', to: '/' },
    { label: 'nav.explore', to: '/explore' },
    { label: 'nav.nearby', to: '/nearby' },
    { label: 'nav.favorites', to: '/favorite' },
    { label: 'nav.map', to: '/map' },
    { label: 'nav.appointments', to: '/appointment' },
    { label: 'nav.calendar', to: '/calendar' }
  ],
  hospital: [
    { label: 'nav.dashboard', to: '/hospital/dashboard' },
    { label: 'nav.hospital', to: '/myHospital' },
    { label: 'nav.feedbacks', to: '/hospital/feedbacks' },
    { label: 'nav.doctors', to: '/hospital/doctors' },
    { label: 'nav.appointments', to: '/hospital/appointments' },
    { label: 'nav.calendar', to: '/hospital/calendar' },
    { label: 'nav.promotions', to: '/hospital/promotion' }
  ],
  doctor: [
    { label: 'nav.dashboard', to: '/doctor/dashboard' },
    { label: 'nav.appointments', to: '/doctor/appointment' },
    { label: 'nav.calendar', to: '/doctor/calendar' }
  ]
}

const activeNav = computed(() => navMap[currentRole.value ?? 'guest'] ?? navMap.guest)
const notificationPreview = computed<HeaderNotification[]>(() =>
  (notifyStore.notifications as HeaderNotification[]).slice(0, 5)
)

const closeMenus = () => {
  mobileMenuOpen.value = false
  notificationOpen.value = false
  profileOpen.value = false
}

const goToNotificationTarget = async (id: number | string) => {
  await notifyStore.markAsSeen(id)
  closeMenus()

  if (currentRole.value === 'user') {
    await router.push('/appointment')
    return
  }

  if (currentRole.value === 'hospital') {
    await router.push('/hospital/appointments')
    return
  }

  if (currentRole.value === 'doctor') {
    await router.push('/doctor/appointment')
    return
  }

  await router.push('/not-found')
}

const handleLogout = async () => {
  localStorage.removeItem('access_token')
  clearActiveHospitalId()
  store.user = null
  store.roles = []
  store.permissions = []
  store.isAuthenticated = false
  socketConstance.disconnect()
  closeMenus()
  await router.push('/landing')
}

const fetchHeaderData = async () => {
  await Promise.allSettled([
    appointmentStore.fetchAppointments(),
    appointmentStore.fetchCalendarData(),
    notifyStore.fetchNotification(),
    notifyStore.fetchUnseenNotifications()
  ])
}

const handleRealtimeUpdate = (data: unknown) => {
  if (data) void fetchHeaderData()
}

onMounted(() => {
  if (!store.user) return

  void fetchHeaderData()

  if (currentRole.value === 'hospital') {
    void appointmentStore.fetchMonthlyAppointment()
    void feedbackStore.fetchMonthlyFeedbacks()
  }

  socketConstance.connect()
  socketConstance.on('appointment-status-changed', handleRealtimeUpdate)
  socketConstance.on('appointment-placed', handleRealtimeUpdate)
  socketConstance.on('notify', handleRealtimeUpdate)
})

onUnmounted(() => {
  socketConstance.off('appointment-status-changed', handleRealtimeUpdate)
  socketConstance.off('appointment-placed', handleRealtimeUpdate)
  socketConstance.off('notify', handleRealtimeUpdate)
})

watch(
  () => route.fullPath,
  () => {
    closeMenus()
  }
)
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="cf-shell">
      <div class="flex min-h-[80px] items-center justify-between gap-4">
        <RouterLink to="/landing" class="flex items-center gap-3">
          <img src="@/assets/logo/care_finder-02.png" alt="Care Finder logo" class="h-10 w-auto" />
        </RouterLink>

        <nav class="hidden items-center gap-2 lg:flex">
          <RouterLink
            v-for="item in activeNav"
            :key="item.to"
            :to="item.to"
            class="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-accent"
            :class="route.path === item.to ? 'bg-accent-tint text-accent-dark' : ''"
          >
            {{ t(item.label) }}
          </RouterLink>
        </nav>

        <div class="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <template v-if="!isLoggedIn">
            <RouterLink
              to="/login"
              class="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              {{ t('common.getStarted') }}
            </RouterLink>
          </template>

          <template v-else>
            <div class="relative">
              <button
                type="button"
                class="relative rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-accent hover:text-accent"
                @click="notificationOpen = !notificationOpen; profileOpen = false"
              >
                <BellIcon class="size-5" />
                <span
                  v-if="unseenCount"
                  class="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white"
                >
                  {{ unseenCount > 99 ? '99+' : unseenCount }}
                </span>
              </button>

              <div
                v-if="notificationOpen"
                class="absolute right-0 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft"
              >
                <div class="flex items-center justify-between px-2 py-1">
                  <p class="text-sm font-semibold text-slate-900">{{ t('common.notifications') }}</p>
                  <span class="text-xs text-slate-500">{{ t('common.unread', { count: unseenCount }) }}</span>
                </div>
                <div v-if="notificationPreview.length" class="mt-2 space-y-2">
                  <button
                    v-for="note in notificationPreview"
                    :key="note.id"
                    type="button"
                    class="w-full rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                    @click="goToNotificationTarget(note.id)"
                  >
                    <p class="text-sm font-medium text-slate-800">
                      {{ note.from || note.user?.first_name || note.user?.fist_name || 'Care Finder' }}
                    </p>
                    <p class="mt-1 text-sm text-slate-600">{{ note.message }}</p>
                    <p class="mt-1 text-xs text-slate-400">{{ note.created_at }}</p>
                  </button>
                </div>
                <p v-else class="px-2 py-6 text-sm text-slate-500">{{ t('common.noNotifications') }}</p>
              </div>
            </div>

            <div class="relative">
              <button
                type="button"
                class="flex items-center gap-3 rounded-full border border-slate-200 px-2 py-1.5 transition hover:border-accent"
                @click="profileOpen = !profileOpen; notificationOpen = false"
              >
                <Avatar v-if="store.user?.profile && store.user.profile !== 'No profile'" class="size-9">
                  <AvatarImage :src="store.user.profile" />
                  <AvatarFallback>{{ userInitials }}</AvatarFallback>
                </Avatar>
                <div
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                >
                  {{ userInitials }}
                </div>
                <div class="text-left">
                  <p class="text-sm font-semibold text-slate-800">{{ displayName }}</p>
                  <p class="text-xs capitalize text-slate-500">{{ currentRole ? t(`roles.${currentRole}`, currentRole) : t('common.member') }}</p>
                </div>
              </button>

              <div
                v-if="profileOpen"
                class="absolute right-0 mt-3 w-60 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft"
              >
                <RouterLink
                  :to="profileRoute"
                  class="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {{ t('common.profile') }}
                </RouterLink>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  @click="handleLogout"
                >
                  <LogOutIcon class="size-4" />
                  {{ t('common.logout') }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <MenuIcon class="size-5" />
        </button>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:hidden"
      >
        <div v-if="isLoggedIn" class="mb-4 rounded-2xl bg-slate-50 p-4">
          <p class="text-sm font-semibold text-slate-900">{{ displayName }}</p>
          <p class="mt-1 text-xs capitalize text-slate-500">{{ currentRole ? t(`roles.${currentRole}`, currentRole) : t('common.member') }}</p>
        </div>

        <LanguageSwitcher class="mb-4" />

        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="item in activeNav"
            :key="`${item.to}-mobile`"
            :to="item.to"
            class="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {{ t(item.label) }}
          </RouterLink>
        </div>

        <div v-if="isLoggedIn" class="mt-4 border-t border-slate-200 pt-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {{ t('common.notifications') }}
          </p>
          <div v-if="notificationPreview.length" class="space-y-2">
            <button
              v-for="note in notificationPreview"
              :key="`${note.id}-mobile`"
              type="button"
              class="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left"
              @click="goToNotificationTarget(note.id)"
            >
              <p class="text-sm font-medium text-slate-800">{{ note.message }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ note.created_at }}</p>
            </button>
          </div>
          <p v-else class="text-sm text-slate-500">{{ t('common.noNotifications') }}</p>

          <div class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
            <RouterLink
              :to="profileRoute"
              class="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {{ t('common.profile') }}
            </RouterLink>
            <button
              type="button"
              class="rounded-2xl bg-rose-50 px-4 py-3 text-left text-sm font-medium text-rose-600"
              @click="handleLogout"
            >
              {{ t('common.logout') }}
            </button>
          </div>
        </div>

        <RouterLink
          v-else
          to="/login"
          class="mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
        >
          {{ t('common.getStarted') }}
        </RouterLink>
      </div>
    </div>
  </header>
</template>
