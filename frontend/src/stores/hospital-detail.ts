import axiosInstance from '@/plugins/axios'
import { defineStore } from 'pinia'
export const hospitalDetailStore = defineStore('hospitalDetail', {
  state: () => ({
    id: null as string | number | null,
    hospitalDetail: {} as any,
    appointment: [] as any[]
  }),
  actions: {
    async fetchHospitalDetail(id: any) {
      try {
        const { data } = await axiosInstance.get(`/hospitals/show/${id}`)
        this.hospitalDetail = data
        this.appointment=data.appointment
        console.log(data)
      } catch (err) {
        console.log(err)
      }
    },
    async submitFeedback(feedback: { hospitalId:any ,content:any ,star:any}) {
      try {
        const { data } = await axiosInstance.post(`/rates`, feedback)
        console.log(data)
      }catch (error){
        console.log(error)
      }
    }
  }
})
