<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'

const { t } = useI18n()

// Minimal image-slideshow carousel built on native CSS scroll-snap - no new
// dependency (replaces Element Plus's el-carousel, used only for simple
// full-bleed image strips, nothing fancier).
const props = withDefaults(
  defineProps<{
    count: number
    autoplay?: boolean
    interval?: number
  }>(),
  {
    autoplay: false,
    interval: 4000
  }
)

const trackRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function scrollToIndex(index: number) {
  const track = trackRef.value
  if (!track || props.count === 0) return
  const clamped = ((index % props.count) + props.count) % props.count
  const slide = track.children[clamped] as HTMLElement | undefined
  slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  activeIndex.value = clamped
}

function next() {
  scrollToIndex(activeIndex.value + 1)
}
function prev() {
  scrollToIndex(activeIndex.value - 1)
}

function handleScroll() {
  const track = trackRef.value
  if (!track || !track.clientWidth) return
  const index = Math.round(track.scrollLeft / track.clientWidth)
  activeIndex.value = Math.min(Math.max(index, 0), props.count - 1)
}

onMounted(() => {
  if (props.autoplay && props.count > 1) {
    timer = setInterval(next, props.interval)
  }
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="group/carousel relative h-full w-full overflow-hidden">
    <div
      ref="trackRef"
      class="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll="handleScroll"
    >
      <slot />
    </div>
    <template v-if="count > 1">
      <button
        type="button"
        :aria-label="t('ui.previousSlide')"
        class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-ink opacity-0 shadow-soft transition group-hover/carousel:opacity-100"
        @click="prev"
      >
        <ChevronLeftIcon class="size-4" />
      </button>
      <button
        type="button"
        :aria-label="t('ui.nextSlide')"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-ink opacity-0 shadow-soft transition group-hover/carousel:opacity-100"
        @click="next"
      >
        <ChevronRightIcon class="size-4" />
      </button>
      <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        <button
          v-for="i in count"
          :key="i"
          type="button"
          :aria-label="t('ui.goToSlide', { index: i })"
          class="size-1.5 rounded-full transition"
          :class="i - 1 === activeIndex ? 'bg-white' : 'bg-white/50'"
          @click="scrollToIndex(i - 1)"
        />
      </div>
    </template>
  </div>
</template>
