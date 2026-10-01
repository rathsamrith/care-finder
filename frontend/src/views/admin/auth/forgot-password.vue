<template>
  <WebLayout>
    <div class="mx-auto max-w-md py-16">
      <Card padding="p-8 sm:p-10" class="text-center">
        <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ t('auth.forgot.title') }}</h2>
        <p class="mt-2 text-sm text-slate-600">{{ t('auth.forgot.subtitle') }}</p>
        <form class="mt-6 text-left" @submit.prevent="forgotPassword">
          <label class="text-sm font-semibold text-ink">{{ t('auth.email') }}</label>
          <input
            type="email"
            v-model="forgotPasswordEmail"
            required
            :placeholder="t('auth.emailPlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-accent"
          />
          <UiButton type="submit" variant="primary" class="mt-6 w-full justify-center">{{ t('auth.forgot.send') }}</UiButton>
        </form>
        <p class="mt-6 text-sm text-slate-600">
          {{ t('auth.noAccount') }} <router-link to="/login" class="font-semibold text-accent hover:text-accent-dark">{{ t('auth.register') }}</router-link>
        </p>
      </Card>
    </div>
  </WebLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { resetPasswordStore } from '@/stores/reset-password'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
const { t } = useI18n()
const forgotPasswordEmail = ref('')
const router = useRouter()
const store = resetPasswordStore()

async function forgotPassword() {
  try {
    await store.sentRequest(forgotPasswordEmail.value)
    if (store.message.success) {
      toast.success(store.message.message ?? '')
      await router.push('/login')
    } else {
      toast.warning(store.message.message ?? '')
      location.reload()
    }
  } catch (error) {
    console.error(error)
  }
}
</script>
