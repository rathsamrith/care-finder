<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MailIcon } from '@lucide/vue'
import axiosInstance from '@/plugins/axios'
import { team } from '@/lib/team'
import contactImage from '@/assets/image/contact.png'

const { t } = useI18n()

const email = ref('')
const message = ref('')
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  try {
    const { data } = await axiosInstance.post('/contact', { email: email.value, message: message.value })
    toast.success(data.message ?? t('contact.sent'))
    email.value = ''
    message.value = ''
  } catch (error: any) {
    const errorMessage = Array.isArray(error?.response?.data?.message)
      ? error.response.data.message.join(', ')
      : (error?.response?.data?.message ?? t('contact.error'))
    toast.error(errorMessage)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <WebLayout>
    <section class="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
          {{ t('contact.kicker') }}
        </p>
        <h1 class="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {{ t('contact.title') }}
        </h1>
        <p class="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          {{ t('contact.intro') }}
        </p>
      </div>
      <img :src="contactImage" :alt="t('contact.imageAlt')" class="mx-auto w-full max-w-md" />
    </section>

    <section class="mt-10">
      <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
        {{ t('contact.team.kicker') }}
      </p>
      <h2 class="mt-2 text-2xl font-semibold tracking-tight text-ink">{{ t('contact.team.title') }}</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
        <Card v-for="member in team" :key="member.name" padding="p-5" class="text-center">
          <img
            :src="member.photo"
            :alt="member.name"
            class="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-accent-tint"
          />
          <h3 class="mt-4 text-sm font-semibold text-ink">{{ member.name }}</h3>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-accent">{{ t('contact.team.contributor') }}</p>
        </Card>
      </div>
    </section>

    <section class="mt-10 text-center">
      <h2 class="text-3xl font-semibold tracking-tight text-ink">{{ t('contact.formTitle') }}</h2>
      <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {{ t('contact.formIntro') }}
      </p>
    </section>

    <section class="mt-8">
      <Card padding="p-8 sm:p-10" class="mx-auto max-w-2xl">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-1.5">
            <Label for="email-address">{{ t('contact.email') }}</Label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <MailIcon class="size-4" />
              </span>
              <Input
                id="email-address"
                v-model="email"
                type="email"
                required
                :placeholder="t('contact.emailPlaceholder')"
                class="pl-10"
              />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="message">{{ t('contact.message') }}</Label>
            <Textarea
              id="message"
              v-model="message"
              required
              :rows="5"
              :placeholder="t('contact.messagePlaceholder')"
            />
          </div>
          <div class="flex justify-end">
            <UiButton type="submit" variant="primary" :disabled="submitting">
              {{ submitting ? t('contact.sending') : t('contact.submit') }}
            </UiButton>
          </div>
        </form>
      </Card>
    </section>
  </WebLayout>
</template>
