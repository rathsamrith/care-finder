<template>
  <WebLayout>
    <div class="mx-auto max-w-md py-16">
      <Card padding="p-8 sm:p-10" class="text-center">
        <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ t('auth.reset.title') }}</h2>
        <form class="mt-6 space-y-4 text-left" @submit.prevent="resetPassword(form)">
          <div>
            <label class="text-sm font-semibold text-ink">{{ t('auth.reset.newPassword') }}</label>
            <input
              type="password"
              v-model="form.newPass"
              required
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-accent"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-ink">{{ t('auth.confirmPassword') }}</label>
            <input
              type="password"
              v-model="form.confirmPassword"
              required
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-accent"
            />
          </div>
          <UiButton type="submit" variant="primary" class="w-full justify-center" :disabled="submitting">{{ t('auth.reset.save') }}</UiButton>
        </form>
      </Card>
    </div>
  </WebLayout>
</template>
<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { resetPasswordStore } from '@/stores/reset-password'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
const { t } = useI18n()
const router = useRouter()
const form = ref({
  token: '',
  newPass: '',
  confirmPassword: ''
})
const route = useRoute()
const store = resetPasswordStore()
// The emailed link carries both: /reset-password?t=<token>&e=<email>
const email = ref('')
const submitting = ref(false)

const resetPassword = async (pass: typeof form.value) => {
  if (!pass.token || !email.value) return toast.error(t('auth.reset.invalidLink'))
  if (pass.newPass.length < 8) return toast.error(t('auth.reset.tooShort'))
  if (pass.newPass !== pass.confirmPassword) return toast.error(t('auth.reset.mismatch'))

  submitting.value = true
  const result = await store.resetPassword({ email: email.value, token: pass.token, password: pass.newPass })
  submitting.value = false

  if (result.success) {
    toast.success(result.message ?? '')
    router.push('/login')
  } else {
    toast.error(result.message || t('auth.reset.failed'))
  }
}
onMounted(() => {
  form.value.token = String(route.query.t ?? '')
  email.value = String(route.query.e ?? '')
})
</script>
