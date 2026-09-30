<script setup lang="ts">
import { computed } from 'vue'
import { TrendingDownIcon, TrendingUpIcon } from '@lucide/vue'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mirrors shadcn's "dashboard-01" stat-card pattern (CardHeader grid with a
// CardAction badge in the corner, CardFooter carrying the two-line trend
// text) - but the trend badge only renders when `trendPercent` is actually
// given. Several of this app's stat tiles are point-in-time counts (total
// hospitals, pending appointments right now, ...) with no prior-period value
// to compare against, so there's nothing real to put in a trend badge for
// those - the component just omits it rather than showing a fabricated
// percentage, per the same real-data-only standard as the rest of this app.
const props = defineProps<{
  label: string
  value: string | number
  trendPercent?: number
  footerTitle?: string
  footerDescription?: string
}>()

const isUp = computed(() => (props.trendPercent ?? 0) >= 0)
const trendLabel = computed(() =>
  props.trendPercent === undefined ? '' : `${isUp.value ? '+' : ''}${props.trendPercent.toFixed(1)}%`
)
</script>

<template>
  <Card class="@container/card">
    <CardHeader>
      <CardDescription>{{ label }}</CardDescription>
      <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{{ value }}</CardTitle>
      <CardAction v-if="trendPercent !== undefined">
        <Badge variant="outline">
          <component :is="isUp ? TrendingUpIcon : TrendingDownIcon" class="size-3.5" />
          {{ trendLabel }}
        </Badge>
      </CardAction>
    </CardHeader>
    <CardFooter v-if="footerTitle || footerDescription" class="flex-col items-start gap-1.5 text-sm">
      <div v-if="footerTitle" class="flex items-center gap-2 font-medium">
        {{ footerTitle }}
        <component
          v-if="trendPercent !== undefined"
          :is="isUp ? TrendingUpIcon : TrendingDownIcon"
          class="size-4"
        />
      </div>
      <div v-if="footerDescription" class="text-muted-foreground">{{ footerDescription }}</div>
    </CardFooter>
  </Card>
</template>
