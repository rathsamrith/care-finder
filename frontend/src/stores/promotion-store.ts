import {defineStore} from "pinia";
import axiosInstance from "@/plugins/axios";

interface PromotionPayload {
    hospitalId?: number | string
    title?: string
    description?: string
    startDate?: string
    endDate?: string
    image?: unknown
}

// Hospital promotions are multipart/form-data on the backend (an optional
// image file rides alongside the plain fields) - build a FormData from
// whatever plain object the caller passes, dropping empty/undefined fields
// and only attaching `image` when it's an actual File (never a leftover
// string placeholder).
function buildPromotionFormData(promotion: PromotionPayload): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(promotion)) {
        if (value === undefined || value === null || value === '') {
            continue
        }
        if (key === 'image') {
            if (typeof value !== 'string') {
                formData.append('image', value as Blob)
            }
            continue
        }
        formData.append(key, String(value))
    }
    return formData
}

export const promotionStore = defineStore("promotion-store", {
    state: () => (
        {
            promotions: [] as any[]
        }
    ),
    actions:{
        async fetchPromotions(hospitalId?: number | string)
        {
            try {
                const {data}=await axiosInstance.get('/hospital-promotions', {
                    params: hospitalId ? { hospitalId } : undefined
                })
                this.promotions = data
                console.log(data)
            }catch (error){
                console.log(error)
            }
        },
        async addPromotion(promotion: PromotionPayload){
            try{
                const formData = buildPromotionFormData(promotion)
                const {data}=await axiosInstance.post('/hospital-promotions', formData)
                console.log(data)
                return data
            }catch (error){
                console.log(error)
            }
        },
        async deletePromotion(id:any){
            try{
                const {data}=await axiosInstance.delete(`/hospital-promotions/${id}`)
                console.log(data)
            }catch (error){
                console.log(error)
            }
        },
        async updatePromotion(id:any, promotion:PromotionPayload){
            try {
                const formData = buildPromotionFormData(promotion)
                const {data}=await axiosInstance.put(`/hospital-promotions/${id}`,formData)
                console.log(data)
                return data
            }catch (error){
                console.log(error)
            }
        }
    }
})
