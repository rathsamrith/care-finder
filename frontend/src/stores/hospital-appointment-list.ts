import {defineStore} from 'pinia'
import axiosInstance from '@/plugins/axios'

export const hospitalAppointmentListStore = defineStore('appointments', {
    state: () => ({
        appointments: [] as any[],
        calendars: [] as any[],
        monthlyAppointment: [] as any[],
        appointmentSummary: {} as any,
        message: {} as any
    }),
    actions: {
        async fetchAppointments() {
            try {
                const {data} = await axiosInstance.get('/appointments/list')
                this.appointments = data
            } catch (error) {
                console.log(error)
            }
        },
        async confirmAppointment(id: any) {
            try {
                const {data} = await axiosInstance.put(`/appointments/update-status/${id}`, { status: 'Confirmed' })
                this.message = data
            } catch (error) {
                console.log(error)
            }
        },
        async fetchMonthlyAppointment() {
            try {
                const {data} = await axiosInstance.get('/appointments/monthlyAppointments')
                this.monthlyAppointment = data
                localStorage.setItem('appointments', JSON.stringify(this.monthlyAppointment))
            } catch (e) {
                console.log(e)
            }
        },
        async fetchAppointmentSummary() {
            try {
                const {data} = await axiosInstance.get('/appointments/summary')
                this.appointmentSummary = data
            } catch (error) {
                console.error('Error fetching appointments for today:', error)
            }
        },
        async cancelAppointment(id: any) {
            try {
                const {data} = await axiosInstance.put(`/appointments/cancel/${id}`, {})
                this.message = data
            } catch (error) {
                console.log(error)
            }
        },
        async fetchCalendarData(params?: {month?: number; year?: number}) {
            try {
                const {data} = await axiosInstance.get('/appointments/calendar', {params})
                this.calendars = data
            } catch (error) {
                console.log(error)
            }
        },
        async removeAppointment(id: any) {
            try {
                const {data} = await axiosInstance.delete(`/appointments/delete/${id}`)
                console.log(data)
            } catch (error) {
                console.log(error)
            }
        },
        async createAppointment(payload: any) {
            const {data} = await axiosInstance.post('/appointments/create', payload)
            return data
        },
        async searchPatients(q: string) {
            if (!q.trim()) return []
            const {data} = await axiosInstance.get('/appointments/patients/search', {params: {q}})
            return data
        }
    }
})
