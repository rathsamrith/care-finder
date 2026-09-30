import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref()
  const isAuthenticated = ref()
  const permissions = ref()
  const roles = ref()
  const hospital=ref()
  // Every hospital the account manages (branch switcher); `hospital` is the active one.
  const hospitals=ref<{ id: number | string; name: string; province?: string | null }[]>([])

  return {
    user,
    roles,
    permissions,
    isAuthenticated,
    hospital,
    hospitals
  }
})
