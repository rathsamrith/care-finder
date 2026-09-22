import { defineStore } from 'pinia';
import axiosInstance from '@/plugins/axios';

export const useDoctorStore = defineStore('doctorStore', {
  state: () => ({
    doctors: [] as any[],
  }),
  actions: {
    async fetchDoctors() {
      try {
        const { data } = await axiosInstance.get('/doctors');
        this.doctors = data;
      } catch (e) {
        console.log(e);
      }
    },
    async createDoctor(doctor: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      response?: string;
      hospitalId: number;
    }) {
      try {
        const { data } = await axiosInstance.post('/doctors', doctor);
        return data;
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    async deleteDoctor(doctorId: any) {
      try {
        const { data } = await axiosInstance.delete(`/doctors/${doctorId}`);
        console.log(data);
      } catch (e) {
        console.error(e);
      }
    },
    async updateDoctor(
      doctorId: any,
      updatedData: { firstName?: string; lastName?: string; phone?: string; response?: string },
    ) {
      try {
        const { data } = await axiosInstance.put(`/doctors/${doctorId}`, updatedData);
        return data;
      } catch (e) {
        console.error(e);
        throw e; // the dialog shows the failure instead of claiming success
      }
    },
  },
});
