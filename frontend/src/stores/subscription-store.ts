import { defineStore } from 'pinia'
import axiosInstance from '@/plugins/axios'

export type SubscribePlan = {
  id: number
  name: string
  price: number
  currency: string
  duration?: number
}

export type SubscribePayment = {
  id: number
  amount: number
  createdAt: string
  subscribePlan: SubscribePlan
}

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    plans: [] as SubscribePlan[],
    payments: [] as SubscribePayment[]
  }),
  actions: {
    async fetchPlans() {
      try {
        const { data } = await axiosInstance.get('/subscribe-plans')
        this.plans = data
      } catch (error) {
        console.log(error)
      }
    },
    async fetchPayments() {
      try {
        const { data } = await axiosInstance.get('/subscription/list')
        this.payments = data
      } catch (error) {
        console.log(error)
      }
    },
    async checkout(subscribePlanId: number) {
      const { data } = await axiosInstance.post('/subscription/checkout', { subscribePlanId })
      return data as { clientSecret: string; paymentIntentId: string }
    },
    async confirm(paymentIntentId: string) {
      const { data } = await axiosInstance.post('/subscription/confirm', { paymentIntentId })
      this.payments.unshift(data)
      return data
    }
  }
})
