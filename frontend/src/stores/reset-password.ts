import axiosInstance from '@/plugins/axios'
import { defineStore } from 'pinia'
import { apiErrorMessage } from '@/lib/api-error'
export const resetPasswordStore = defineStore('resetPassword',{
    state:()=> ({
        token:'',
        message: {} as { success?: boolean; message?: string },
        resetMessage:{} as { success?: boolean; message?: string }
    }),
    actions:{
        async sentRequest(email: string){
            try{
                const {data}=await axiosInstance.post('/forget-password',{
                    email: email
                })
                this.message=data
                this.token=data.reset_token;
            }catch(err){
                console.log(err);
            }
        },
        async resetPassword(payload: { email: string; token: string; password: string }) {
            try {
                const { data } = await axiosInstance.post('/reset-password', payload)
                this.resetMessage = { success: true, message: data.message }
            } catch (err) {
                this.resetMessage = { success: false, message: apiErrorMessage(err, '') }
            }
            return this.resetMessage
        }
    }
})