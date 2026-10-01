import {defineStore} from "pinia";
import axiosInstance from "@/plugins/axios";
export const NotificationStore = defineStore("NotificationStore", {
    state:()=> ({
        message: {} as any,
        notifications: [] as any[],
        unseenNotifications: [] as any[]
    }),
    actions:{
        async fetchNotification() {
            try {
                const {data}=await axiosInstance.get(`/appointment-notifications`)
                this.notifications=data
            }catch(error){
                console.log(error)
            }
        },
        async fetchUnseenNotifications() {
            try {
                const {data}=await axiosInstance.get(`/appointment-notifications/unread`)
                this.unseenNotifications=data
            }catch(error){
                console.log(error)
            }
        },
        async markAsSeen(id:any){
            try {
                const {data}=await axiosInstance.put(`/appointment-notifications/${id}/mark-as-seen`)
                console.log(data)
            }catch (error){
                console.log(error)
            }
        }
    }
})
