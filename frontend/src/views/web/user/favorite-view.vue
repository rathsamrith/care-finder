<template>
  <WebLayout>
    <HeaderView />
    <CardView />
  </WebLayout>
</template>
<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
// @ts-ignore untyped JS SFC
import HeaderView from '@/components/favorites/header-backgrand.vue'
// @ts-ignore untyped JS SFC
import CardView from '@/components/favorites/cards-favorite.vue'
</script>
