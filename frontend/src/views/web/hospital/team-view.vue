<script setup lang="ts">
import { CopyIcon, MailIcon, Trash2Icon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import Badge from '@/components/ui/badge.vue'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/confirm-dialog.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'

type Role = 'Owner' | 'Admin' | 'Manager'
interface Member {
  userId: number | string
  name: string
  email: string
  role: Role
}
interface Invite {
  id: number | string
  email: string
  role: Role
  expiresAt: string
}
interface Team {
  id: number | string
  name: string
  myRole: Role
  hospitals: { id: number | string; name: string }[]
  members: Member[]
  invites: Invite[]
}

const { t } = useI18n()
const auth = useAuthStore()

const team = ref<Team | null>(null)
const loading = ref(true)
const inviting = ref(false)
const invite = ref({ email: '', role: 'Manager' as 'Admin' | 'Manager' })
const fallbackLink = ref('')

const RANK: Record<Role, number> = { Manager: 1, Admin: 2, Owner: 3 }
const isAdminUp = computed(() => !!team.value && RANK[team.value.myRole] >= RANK.Admin)
const isOwner = computed(() => team.value?.myRole === 'Owner')
const myId = computed(() => String(auth.user?.id ?? ''))

// Mirrors the server rules (the server is the authority): Owners remove anyone,
// Admins remove Managers, anyone may leave.
const canRemove = (m: Member) =>
  String(m.userId) === myId.value || isOwner.value || (team.value?.myRole === 'Admin' && m.role === 'Manager')

const load = async () => {
  try {
    const { data } = await axiosInstance.get<Team>('/organizations/mine')
    team.value = data
  } catch (e) {
    toast.error(apiErrorMessage(e, t('team.loadFailed')))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const send = async () => {
  if (!team.value || !invite.value.email.trim()) return
  inviting.value = true
  fallbackLink.value = ''
  try {
    const { data } = await axiosInstance.post(`/organizations/${team.value.id}/invites`, {
      email: invite.value.email.trim(),
      role: invite.value.role
    })
    if (data.acceptUrl) {
      fallbackLink.value = data.acceptUrl
      toast.warning(t('team.emailNotSent'))
    } else {
      toast.success(t('team.inviteSent', { email: data.email }))
    }
    invite.value.email = ''
    await load()
  } catch (e) {
    toast.error(apiErrorMessage(e, t('team.inviteFailed')))
  } finally {
    inviting.value = false
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(fallbackLink.value)
    toast.success(t('team.linkCopied'))
  } catch {
    /* clipboard unavailable: the link is selectable in the box */
  }
}

const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
  try {
    await action()
    toast.success(success)
    await load()
  } catch (e) {
    toast.error(apiErrorMessage(e, failure))
  }
}

const revoke = (inv: Invite) =>
  run(() => axiosInstance.delete(`/organizations/${team.value!.id}/invites/${inv.id}`), t('team.inviteRevoked'), t('team.actionFailed'))

const changeRole = (m: Member, role: Role) =>
  run(() => axiosInstance.put(`/organizations/${team.value!.id}/members/${m.userId}`, { role }), t('team.roleUpdated'), t('team.actionFailed'))

const toRemove = ref<Member | null>(null)
const leavingSelf = computed(() => !!toRemove.value && String(toRemove.value.userId) === myId.value)
const askRemove = (m: Member) => (toRemove.value = m)
const remove = async () => {
  const m = toRemove.value
  if (!m) return
  const leaving = leavingSelf.value
  toRemove.value = null
  await run(
    async () => {
      await axiosInstance.delete(`/organizations/${team.value!.id}/members/${m.userId}`)
      if (leaving) window.location.assign('/landing')
    },
    leaving ? t('team.left') : t('team.removed'),
    t('team.actionFailed')
  )
}

const fieldClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <SectionHeading :kicker="t('team.kicker')">
      <template #title>{{ team?.name ?? t('team.title') }}</template>
    </SectionHeading>

    <p v-if="loading" class="mt-6 text-sm text-slate-500">{{ t('site.loading') }}</p>

    <div v-else-if="team" class="mt-6 space-y-6">
      <p class="text-sm text-slate-600">
        {{ t('team.hospitalsIn', { count: team.hospitals.length }) }}
        <span v-for="h in team.hospitals" :key="h.id" class="ml-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs">{{ h.name }}</span>
      </p>

      <Card v-if="isAdminUp">
        <CardContent class="space-y-3">
          <h3 class="font-semibold text-ink">{{ t('team.inviteTitle') }}</h3>
          <form class="flex flex-wrap items-end gap-3" @submit.prevent="send">
            <label class="min-w-[220px] flex-1 text-sm font-medium text-slate-700">
              {{ t('team.email') }}
              <Input v-model="invite.email" type="email" required class="mt-1" :placeholder="t('team.emailPlaceholder')" />
            </label>
            <label class="text-sm font-medium text-slate-700">
              {{ t('team.role') }}
              <select v-model="invite.role" :class="[fieldClass, 'mt-1 block']">
                <option value="Manager">{{ t('team.roles.Manager') }}</option>
                <option v-if="isOwner" value="Admin">{{ t('team.roles.Admin') }}</option>
              </select>
            </label>
            <Button type="submit" :disabled="inviting"><MailIcon />{{ inviting ? t('team.sending') : t('team.sendInvite') }}</Button>
          </form>
          <p class="text-xs text-slate-500">{{ t('team.roleHelp') }}</p>
          <div v-if="fallbackLink" class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <p class="font-medium text-amber-900">{{ t('team.shareLink') }}</p>
            <div class="mt-2 flex items-center gap-2">
              <input readonly :value="fallbackLink" class="min-w-0 flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-xs" @focus="($event.target as HTMLInputElement).select()" />
              <Button type="button" variant="outline" size="sm" @click="copyLink"><CopyIcon />{{ t('team.copy') }}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('team.member') }}</TableHead>
                <TableHead>{{ t('team.role') }}</TableHead>
                <TableHead class="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="m in team.members" :key="m.userId">
                <TableCell>
                  <p class="font-medium text-ink">{{ m.name || m.email }}</p>
                  <p class="text-xs text-slate-500">{{ m.email }}</p>
                </TableCell>
                <TableCell>
                  <select
                    v-if="isOwner"
                    :value="m.role"
                    :class="fieldClass"
                    :aria-label="t('team.role')"
                    @change="changeRole(m, ($event.target as HTMLSelectElement).value as Role)"
                  >
                    <option v-for="r in ['Owner', 'Admin', 'Manager']" :key="r" :value="r">{{ t(`team.roles.${r}`) }}</option>
                  </select>
                  <Badge v-else tone="accent">{{ t(`team.roles.${m.role}`) }}</Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button v-if="canRemove(m)" variant="ghost" size="sm" @click="askRemove(m)">
                    <Trash2Icon />
                    {{ String(m.userId) === myId ? t('team.leave') : t('team.remove') }}
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card v-if="isAdminUp">
        <CardContent class="space-y-3">
          <h3 class="font-semibold text-ink">{{ t('team.pending') }}</h3>
          <p v-if="!team.invites.length" class="text-sm text-slate-500">{{ t('team.noPending') }}</p>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="inv in team.invites" :key="inv.id" class="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {{ inv.email }}
                <Badge tone="gold" class="ml-2">{{ t(`team.roles.${inv.role}`) }}</Badge>
              </span>
              <Button variant="ghost" size="sm" @click="revoke(inv)">{{ t('team.revoke') }}</Button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
    <ConfirmDialog
      :open="!!toRemove"
      :title="leavingSelf ? t('team.confirmLeaveTitle') : t('team.confirmRemoveTitle')"
      :message="toRemove ? (leavingSelf ? t('team.confirmLeave') : t('team.confirmRemove', { name: toRemove.name || toRemove.email })) : ''"
      :confirm-label="leavingSelf ? t('team.leave') : t('team.remove')"
      :cancel-label="t('hospitalDash.cancel')"
      @update:open="(v: boolean) => !v && (toRemove = null)"
      @confirm="remove"
    />
  </DashboardLayout>
</template>
