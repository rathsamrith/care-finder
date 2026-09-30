<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { CheckIcon } from '@lucide/vue'
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import SectionHeading from '@/components/ui/section-heading.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { stripePromise } from '@/plugins/stripe'
import type { SubscribePlan } from '@/stores/subscription-store'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const subscriptionStore = useSubscriptionStore()

const centerDialogVisible = ref(false)
const selectedPlan = ref<SubscribePlan | null>(null)
const email = ref('')
const paying = ref(false)
const cardMountEl = ref<HTMLDivElement | null>(null)
const stripe = ref<Stripe | null>(null)

let elements: StripeElements | null = null
let cardElement: StripeCardElement | null = null

const planDurationLabel = (plan: SubscribePlan) =>
  plan.duration ? t('hospitalDash.service.days', plan.duration) : t('hospitalDash.service.oneTime')

const openDialog = async (plan: SubscribePlan) => {
  selectedPlan.value = plan
  centerDialogVisible.value = true

  stripe.value = await stripePromise
  if (!stripe.value) return

  elements = stripe.value.elements()
  cardElement = elements.create('card')
  // Wait for the dialog's card mount point to exist in the DOM.
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (cardMountEl.value) {
    cardElement.mount(cardMountEl.value)
  }
}

const closeDialog = () => {
  cardElement?.unmount()
  cardElement = null
  elements = null
}

watch(centerDialogVisible, (visible) => {
  if (!visible) closeDialog()
})

const makePayment = async () => {
  if (!selectedPlan.value) return

  if (!stripe.value || !cardElement) {
    toast.warning(t('hospitalDash.service.notConfiguredToast'))
    return
  }

  paying.value = true
  try {
    const { clientSecret } = await subscriptionStore.checkout(selectedPlan.value.id)
    const result = await stripe.value.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { email: email.value || undefined }
      }
    })

    if (result.error) {
      toast.error(result.error.message ?? t('hospitalDash.service.tryAgain'))
      return
    }

    if (result.paymentIntent?.status === 'succeeded') {
      await subscriptionStore.confirm(result.paymentIntent.id)
      toast.success(t('hospitalDash.service.paymentSucceeded'))
      centerDialogVisible.value = false
    }
  } catch (error) {
    console.log(error)
    toast.error(t('hospitalDash.service.paymentProblem'))
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  subscriptionStore.fetchPlans()
})

onBeforeUnmount(() => {
  cardElement?.unmount()
})
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <SectionHeading :kicker="t('hospitalDash.service.kicker')">
      <template #title>{{ t('hospitalDash.service.title') }}</template>
    </SectionHeading>
    <div class="mt-6 grid gap-6 sm:grid-cols-3">
      <Card v-for="plan in subscriptionStore.plans" :key="plan.id" class="flex flex-col">
        <CardContent class="flex flex-1 flex-col text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{{ plan.name }}</p>
          <p class="mt-2 text-4xl font-semibold text-ink">{{ plan.currency }} {{ plan.price }}</p>
          <div class="mt-4 flex-1 space-y-2 text-left">
            <div class="flex items-start gap-2 text-sm text-slate-600">
              <CheckIcon class="mt-0.5 size-4 text-success" />
              {{ t('hospitalDash.service.billingPeriod', { period: planDurationLabel(plan) }) }}
            </div>
          </div>
          <Button class="mt-6 w-full justify-center" @click="openDialog(plan)">{{ t('hospitalDash.service.subscribe') }}</Button>
        </CardContent>
      </Card>
      <p v-if="!subscriptionStore.plans.length" class="text-sm text-slate-500">{{ t('hospitalDash.service.noPlans') }}</p>
    </div>

    <Dialog v-model:open="centerDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('hospitalDash.service.payment') }}</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent class="p-5">
            <div class="flex items-center justify-between text-sm">
              <p class="font-medium text-ink">{{ selectedPlan?.name }}</p>
              <p class="font-semibold text-ink">{{ selectedPlan?.currency }} {{ selectedPlan?.price }}</p>
            </div>

            <template v-if="stripe">
              <div class="mt-4">
                <p class="text-sm font-medium text-ink">{{ t('hospitalDash.service.email') }}</p>
                <Input v-model="email" type="email" :placeholder="t('hospitalDash.service.emailPlaceholder')" class="mt-1" />
              </div>
              <div class="mt-4">
                <p class="text-sm font-medium text-ink">{{ t('hospitalDash.service.cardDetails') }}</p>
                <div ref="cardMountEl" class="mt-1 rounded-lg border border-slate-200 p-3" />
              </div>
              <Button
                class="mt-6 w-full justify-center"
                :disabled="paying"
                @click="makePayment"
              >
                {{ paying ? t('hospitalDash.service.processing') : t('hospitalDash.service.makePayment') }}
              </Button>
            </template>
            <p v-else class="mt-4 text-sm text-slate-500">
              {{ t('hospitalDash.service.notConfigured') }}
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  </DashboardLayout>
</template>
