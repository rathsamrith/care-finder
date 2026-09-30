<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BellIcon, LogOutIcon, UserIcon } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth-store'
import { clearActiveHospitalId } from '@/lib/active-hospital'
import HospitalSwitcher from '@/components/layouts/hospital-switcher.vue'
import { NotificationStore } from '@/stores/notification-store'
import { socketConstance } from '@/plugins/socket'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type NavItem = {
  label: string
  to: string
  icon: unknown
}

const props = withDefaults(
  defineProps<{
    navItems: NavItem[]
    portalLabel: string
    withNotifications?: boolean
  }>(),
  {
    withNotifications: true
  }
)

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useAuthStore()
const notifyStore = NotificationStore()

const displayName = computed(() =>
  store.user ? `${store.user.first_name ?? ''} ${store.user.last_name ?? ''}`.trim() : t('common.guest')
)
const userInitials = computed(() => {
  const first = store.user?.first_name?.[0] ?? 'C'
  const last = store.user?.last_name?.[0] ?? 'F'
  return `${first}${last}`.toUpperCase()
})
const currentRole = computed(() => (Array.isArray(store.roles) && store.roles.length > 0 ? store.roles[0] : null))
const unseenCount = computed(() => (props.withNotifications ? notifyStore.unseenNotifications.length : 0))
const notificationPreview = computed(
  () => (notifyStore.notifications as { id: number | string; message?: string; created_at?: string }[]).slice(0, 5)
)

const handleRealtimeUpdate = (data: unknown) => {
  if (data) {
    notifyStore.fetchNotification()
    notifyStore.fetchUnseenNotifications()
  }
}

const goToNotification = async (id: number | string) => {
  await notifyStore.markAsSeen(id)
}

const goToProfile = () => router.push('/profile')

const handleLogout = async () => {
  localStorage.removeItem('access_token')
  clearActiveHospitalId()
  store.user = null
  store.roles = []
  store.permissions = []
  store.isAuthenticated = false
  socketConstance.disconnect()
  await router.push('/landing')
}

onMounted(() => {
  if (props.withNotifications) {
    notifyStore.fetchNotification()
    notifyStore.fetchUnseenNotifications()
    socketConstance.connect()
    socketConstance.on('appointment-status-changed', handleRealtimeUpdate)
    socketConstance.on('appointment-placed', handleRealtimeUpdate)
    socketConstance.on('notify', handleRealtimeUpdate)
  }
})

onUnmounted(() => {
  if (props.withNotifications) {
    socketConstance.off('appointment-status-changed', handleRealtimeUpdate)
    socketConstance.off('appointment-placed', handleRealtimeUpdate)
    socketConstance.off('notify', handleRealtimeUpdate)
  }
})
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <div class="flex items-center gap-3 px-2 py-2">
          <img src="@/assets/logo/care_finder-02.png" alt="Care Finder logo" class="h-8 w-auto" />
          <span class="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/70">
            {{ portalLabel }}
          </span>
        </div>
        <HospitalSwitcher class="mx-2 mb-1" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in navItems" :key="item.to">
                <SidebarMenuButton as-child :is-active="route.path === item.to">
                  <RouterLink :to="item.to">
                    <component :is="item.icon" />
                    <span>{{ t(item.label) }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton size="lg">
                  <Avatar class="size-7 rounded-lg">
                    <AvatarFallback class="rounded-lg bg-primary text-xs text-primary-foreground">
                      {{ userInitials }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">{{ displayName }}</span>
                    <span class="truncate text-xs capitalize text-sidebar-foreground/70">{{ currentRole || t('common.member') }}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" class="w-56">
                <DropdownMenuItem @click="goToProfile">
                  <UserIcon />
                  {{ t('common.profile') }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" @click="handleLogout">
                  <LogOutIcon />
                  {{ t('common.logout') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset class="min-w-0">
      <header class="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger />

        <DropdownMenu v-if="withNotifications">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="relative">
              <BellIcon />
              <Badge
                v-if="unseenCount"
                variant="destructive"
                class="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
              >
                {{ unseenCount > 99 ? '99+' : unseenCount }}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-80">
            <DropdownMenuLabel class="flex items-center justify-between">
              {{ t('common.notifications') }}
              <span class="text-xs font-normal text-muted-foreground">{{ t('common.unread', { count: unseenCount }) }}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              v-for="note in notificationPreview"
              :key="note.id"
              class="flex-col items-start whitespace-normal py-2"
              @click="goToNotification(note.id)"
            >
              <p class="text-sm">{{ note.message }}</p>
              <p class="text-xs text-muted-foreground">{{ note.created_at }}</p>
            </DropdownMenuItem>
            <p v-if="!notificationPreview.length" class="px-2 py-6 text-center text-sm text-muted-foreground">
              {{ t('common.noNotifications') }}
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div class="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
