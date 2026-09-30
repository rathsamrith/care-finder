<script setup lang="ts">
import { CopyIcon, Trash2Icon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/confirm-dialog.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import SectionHeading from '@/components/ui/section-heading.vue'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'

// Check-in tablets for the active hospital. Creating one shows its device key
// ONCE (only a hash is kept); the tablet opens /kiosk and is paired with that key.
const { t } = useI18n()
const auth = useAuthStore()
const hospitalId = computed(() => (auth.hospital as { id?: number | string } | undefined)?.id ?? null)

interface Kiosk {
  id: number | string
  name: string
  prefix: string
  lastSeenAt: string | null
}

const kiosks = ref<Kiosk[]>([])
const loading = ref(true)
const creating = ref(false)
const form = ref({ name: '', prefix: '' })
const fresh = ref<{ name: string; prefix: string; key: string } | null>(null)
const error = ref('')

const kioskUrl = computed(() => `${window.location.origin}/kiosk`)

const load = async () => {
  if (!hospitalId.value) {
    loading.value = false
    return
  }
  try {
    const { data } = await axiosInstance.get<Kiosk[]>(`/hospitals/${hospitalId.value}/kiosks`)
    kiosks.value = data
  } catch (e) {
    error.value = apiErrorMessage(e, t('kiosks.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const create = async () => {
  error.value = ''
  const prefix = form.value.prefix.trim().toUpperCase()
  if (!form.value.name.trim() || !/^[A-Z]{1,3}$/.test(prefix)) {
    error.value = t('kiosks.invalid')
    return
  }
  creating.value = true
  try {
    const { data } = await axiosInstance.post(`/hospitals/${hospitalId.value}/kiosks`, { name: form.value.name.trim(), prefix })
    fresh.value = { name: data.name, prefix: data.prefix, key: data.key }
    form.value = { name: '', prefix: '' }
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('kiosks.createFailed'))
  } finally {
    creating.value = false
  }
}

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('kiosks.copied'))
  } catch {
    /* clipboard unavailable: the value is selectable in the box */
  }
}

const toRevoke = ref<Kiosk | null>(null)
const revoking = ref(false)
const askRevoke = (kiosk: Kiosk) => (toRevoke.value = kiosk)
const revoke = async () => {
  const kiosk = toRevoke.value
  if (!kiosk) return
  revoking.value = true
  try {
    await axiosInstance.delete(`/hospitals/${hospitalId.value}/kiosks/${kiosk.id}`)
    toast.success(t('kiosks.revoked'))
    toRevoke.value = null
    await load()
  } catch (e) {
    toast.error(apiErrorMessage(e, t('kiosks.revokeFailed')))
  } finally {
    revoking.value = false
  }
}

const seen = (value: string | null) => (value ? new Date(value).toLocaleString() : t('kiosks.never'))
const inputClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <SectionHeading :kicker="t('kiosks.kicker')">
      <template #title>{{ t('kiosks.title') }}</template>
    </SectionHeading>
    <p class="mt-2 max-w-2xl text-sm text-slate-600">{{ t('kiosks.subtitle') }}</p>

    <p v-if="!hospitalId && !loading" class="mt-6 text-sm text-slate-600">{{ t('siteEditor.noHospital') }}</p>

    <template v-else>
      <!-- The key is shown once, here -->
      <Card v-if="fresh" class="mt-6 border-amber-300 bg-amber-50">
        <CardContent class="space-y-3">
          <h3 class="font-semibold text-amber-900">{{ t('kiosks.keyTitle', { name: fresh.name }) }}</h3>
          <p class="text-sm text-amber-900">{{ t('kiosks.keyWarning') }}</p>
          <div class="flex items-center gap-2">
            <input readonly :value="fresh.key" class="min-w-0 flex-1 rounded border border-amber-200 bg-white px-2 py-2 font-mono text-xs" data-testid="device-key" @focus="($event.target as HTMLInputElement).select()" />
            <Button type="button" variant="outline" size="sm" @click="copy(fresh.key)"><CopyIcon />{{ t('kiosks.copy') }}</Button>
          </div>
          <ol class="list-decimal space-y-1 pl-5 text-sm text-amber-900">
            <li>{{ t('kiosks.step1') }} <code class="rounded bg-white px-1">{{ kioskUrl }}</code></li>
            <li>{{ t('kiosks.step2') }}</li>
            <li>{{ t('kiosks.step3') }}</li>
          </ol>
          <Button type="button" size="sm" @click="fresh = null">{{ t('kiosks.savedIt') }}</Button>
        </CardContent>
      </Card>

      <Card class="mt-6">
        <CardContent class="space-y-3">
          <h3 class="font-semibold text-ink">{{ t('kiosks.addTitle') }}</h3>
          <form class="flex flex-wrap items-end gap-3" @submit.prevent="create">
            <label class="min-w-[220px] flex-1 text-sm font-medium text-slate-700">
              {{ t('kiosks.name') }}
              <Input v-model="form.name" maxlength="60" class="mt-1" :placeholder="t('kiosks.namePlaceholder')" />
            </label>
            <label class="text-sm font-medium text-slate-700">
              {{ t('kiosks.prefix') }}
              <input v-model="form.prefix" maxlength="3" :class="[inputClass, 'mt-1 block w-24 font-mono uppercase']" placeholder="A" />
            </label>
            <Button type="submit" :disabled="creating">{{ creating ? t('kiosks.creating') : t('kiosks.create') }}</Button>
          </form>
          <p class="text-xs text-slate-500">{{ t('kiosks.prefixHelp') }}</p>
          <p v-if="error" role="alert" class="rounded-lg bg-danger-light p-3 text-sm text-danger">{{ error }}</p>
        </CardContent>
      </Card>

      <Card class="mt-6">
        <CardContent class="p-0">
          <p v-if="loading" class="p-6 text-sm text-slate-500">{{ t('site.loading') }}</p>
          <p v-else-if="!kiosks.length" class="p-6 text-sm text-slate-500">{{ t('kiosks.none') }}</p>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="k in kiosks" :key="k.id" class="flex items-center justify-between gap-4 px-6 py-3">
              <div>
                <p class="font-medium text-ink">
                  <span class="mr-2 rounded bg-accent-tint px-2 py-0.5 font-mono text-sm font-bold text-accent-dark">{{ k.prefix }}</span>{{ k.name }}
                </p>
                <p class="text-xs text-slate-500">{{ t('kiosks.lastSeen', { when: seen(k.lastSeenAt) }) }}</p>
              </div>
              <Button variant="ghost" size="sm" @click="askRevoke(k)"><Trash2Icon />{{ t('kiosks.revoke') }}</Button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
    <ConfirmDialog
      :open="!!toRevoke"
      :title="t('kiosks.confirmTitle')"
      :message="toRevoke ? t('kiosks.confirmRevoke', { name: toRevoke.name }) : ''"
      :confirm-label="t('kiosks.revoke')"
      :cancel-label="t('hospitalDash.cancel')"
      :busy="revoking"
      @update:open="(v: boolean) => !v && (toRevoke = null)"
      @confirm="revoke"
    />
  </DashboardLayout>
</template>
