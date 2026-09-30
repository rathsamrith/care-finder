<template>
  <WebLayout>
    <Card padding="p-6 sm:p-8">
      <SectionHeading :kicker="$t('posts.kicker')">
        <template #title>{{ $t('posts.title') }}</template>
        <template #subtitle>{{ $t('posts.subtitle') }}</template>
      </SectionHeading>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <th scope="col" class="py-3 pr-4 font-mono">{{ $t('posts.id') }}</th>
              <th scope="col" class="py-3 pr-4">{{ $t('posts.postTitle') }}</th>
              <th scope="col" class="py-3">{{ $t('posts.description') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="post in store.posts"
              :key="post.id"
              class="border-b border-slate-100 text-slate-600 last:border-0"
            >
              <th scope="row" class="py-3 pr-4 font-mono font-medium text-ink">{{ post.id }}</th>
              <td class="py-3 pr-4 text-ink">{{ post.title }}</td>
              <td class="py-3">{{ post.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </WebLayout>
</template>

<script>
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import { usePostStore } from '@/stores/post-list'

export default {
  name: 'PostList',
  components: {
    WebLayout,
    Card,
    SectionHeading
  },
  data() {
    return {
      store: usePostStore(),
    }
  },
  mounted() {
    this.fetchPosts()
  },
  methods: {
    fetchPosts() {
      this.store.fetchPosts()
    }
  }
}
</script>
