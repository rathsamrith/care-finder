<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { apiErrorMessage } from '@/lib/api-error'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'

// The invitation email links here: /accept-invite?t=<token>&e=<email>.
// Accepting is an explicit click (never automatic on page load), and only works
// while signed in as the invited email - the server checks both.
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const token = computed(() => String(route.query.t ?? ''))
const email = computed(() => String(route.query.e ?? ''))
const valid = computed(() => /^[a-f0-9]{32,128}$/.test(token.value))
const signedIn = computed(() => Boolean(auth.isAuthenticated))

const accepting = ref(false)
const error = ref('')

const accept = async () => {
  accepting.value = true
  error.value = ''
  try {
    const { data } = await axiosInstance.post('/organizations/invites/accept', { token: token.value })
    toast.success(t('team.accept.joined', { name: data.name }))
    // Full load: /me now lists the new organization's hospitals.
    window.location.assign('/hospital/dashboard')
  } catch (e) {
    error.value = apiErrorMessage(e, t('team.accept.failed'))
  } finally {
    accepting.value = false
  }
}
</script>

<template>
  <WebLayout>
    <div class="mx-auto max-w-md py-16">
      <Card padding="p-8 sm:p-10" class="text-center">
        <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ t('team.accept.title') }}</h2>

        <p v-if="!valid" class="mt-4 text-sm text-slate-600">{{ t('team.accept.invalid') }}</p>

        <template v-else-if="!signedIn">
          <p class="mt-3 text-sm text-slate-600">{{ t('team.accept.signIn', { email }) }}</p>
          <p class="mt-2 text-xs text-slate-500">{{ t('team.accept.thenReopen') }}</p>
          <RouterLink to="/login" class="mt-6 block">
            <UiButton variant="primary" class="w-full justify-center">{{ t('team.accept.goLogin') }}</UiButton>
          </RouterLink>
        </template>

        <template v-else>
          <p class="mt-3 text-sm text-slate-600">{{ t('team.accept.body', { email }) }}</p>
          <p v-if="error" class="mt-4 rounded-lg bg-danger-light p-3 text-sm text-danger" role="alert">{{ error }}</p>
          <UiButton variant="primary" class="mt-6 w-full justify-center" :disabled="accepting" @click="accept">
            {{ accepting ? t('team.accept.accepting') : t('team.accept.button') }}
          </UiButton>
        </template>
      </Card>
    </div>
  </WebLayout>
</template>
