import { defineStore } from 'pinia'
import axiosInstance from '@/plugins/axios'

export type UserAddress = {
  id: number
  village?: string
  commune?: string
  district?: string
  province?: string
  latitude?: string
  longitude?: string
}

export const useUserAddressStore = defineStore('user-address', {
  state: () => ({
    addresses: [] as UserAddress[]
  }),
  actions: {
    async fetchAddresses() {
      try {
        const { data } = await axiosInstance.get('/user-addresses')
        this.addresses = data
      } catch (error) {
        console.log(error)
      }
    },
    async createAddress(payload: Partial<UserAddress>) {
      try {
        const { data } = await axiosInstance.post('/user-addresses', payload)
        this.addresses.unshift(data)
        return data
      } catch (error) {
        console.log(error)
      }
    },
    async updateAddress(id: number, payload: Partial<UserAddress>) {
      try {
        const { data } = await axiosInstance.put(`/user-addresses/${id}`, payload)
        const index = this.addresses.findIndex((a) => a.id === id)
        if (index !== -1) this.addresses[index] = data
        return data
      } catch (error) {
        console.log(error)
      }
    }
  }
})
