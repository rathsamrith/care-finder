<template>
  <WebLayout>
    <div class="container mt-4 p-4 bg-white shadow rounded">
      <div class="text-center mb-4">
        <p class="fs-4 fw-bold">Your journey to excellence starts here.</p>
        <p>Join Us Today and Get Started</p>
      </div>
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Title</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in store.posts" :key="post.id">
              <th scope="row">{{ post.id }}</th>
              <td>{{ post.title }}</td>
              <td>{{ post.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </WebLayout>
</template>

<script setup lang="ts">
import WebLayout from '@/Components/Layouts/WebLayout.vue'
import { usePostStore } from '@/stores/post-list'
import { onMounted } from 'vue'
const store = usePostStore()
onMounted(async () => {
  await store.fetchPosts()
})
</script>
