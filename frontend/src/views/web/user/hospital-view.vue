<template>
  <WebLayout>
    <HospitalDiscount></HospitalDiscount>
    <CardTopHospital :cards="store.mostRated"></CardTopHospital>
    <CategoryView></CategoryView>
    <HospitalAddressCard></HospitalAddressCard>
  </WebLayout>
</template>
<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
// @ts-ignore untyped JS SFC
import HospitalAddressCard from '@/components/hospitals/hospital-address-card.vue'
import CardTopHospital from '@/components/users/card-top-hospital/card-top-hospital.vue';
import CategoryView from '@/components/hospitals/category-view.vue';
import HospitalDiscount from '@/components/hospitals/hospital-discount.vue';
import {FeedbackList} from "@/stores/feedback-list";
import {onMounted} from "vue";
const store=FeedbackList()
onMounted(()=>{
  store.fetchMostRated()
})
</script>
<style scoped></style>