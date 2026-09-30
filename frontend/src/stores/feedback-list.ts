import { defineStore } from 'pinia'
import axiosInstance from '@/plugins/axios'

export const FeedbackList = defineStore('feedback-list', {
  state: () => ({
    allFeedback: [] as any[],
    recentFeedbacks: [] as any[],
    monthlyFeedbacks: [] as any[],
    feedbackDetails: {} as any,
    mostRated: [] as any[],
  }),
  actions: {
    async fetchFeedback(hospitalId?: number | string) {
      try {
        const { data } = await axiosInstance.get('/rates', {
          params: hospitalId ? { hospitalId } : undefined
        })
        this.allFeedback = data
      } catch (error) {
        console.log(error)
      }
    },
    async deleteFeedback(id: number) {
      try {
        const response = await axiosInstance.delete(`/rates/${id}`)
        console.log(response)
      } catch (error) {
        console.log(error)
      }
    },
    async fetchRecentFeedbacks(hospitalId?: number | string) {
      try {
        const { data } = await axiosInstance.get('/rates/recent', {
          params: hospitalId ? { hospitalId } : undefined
        })
        this.recentFeedbacks = data
      } catch (error) {
        console.log(error)
      }
    },
    async fetchMonthlyFeedbacks(hospitalId?: number | string) {
      try {
        const { data } = await axiosInstance.get('/rates/monthly', {
          params: hospitalId ? { hospitalId } : undefined
        })
        this.monthlyFeedbacks = data
        localStorage.setItem('monthlyFeedbacks', JSON.stringify(this.monthlyFeedbacks))
      } catch (error) {
        console.log(error)
      }
    },
    async showFeedback(id: number) {
      try {
        const {data}=await axiosInstance.get(`/rates/${id}`)
        this.feedbackDetails=data
      }catch (e){
        console.log(e)
      }
    },
    async fetchMostRated(){
      try{
        const {data}=await axiosInstance.get('/rates/most-rated')
        this.mostRated=data
        console.log(data)
      }catch (error){
        console.log(error)
      }
    }
  }
})
