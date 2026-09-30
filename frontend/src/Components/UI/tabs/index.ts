import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './tabs.vue'
export { default as TabsContent } from './tabs-content.vue'
export { default as TabsList } from './tabs-list.vue'
export { default as TabsTrigger } from './tabs-trigger.vue'

export const tabsListVariants = cva(
  'rounded-lg p-0.75 group-data-horizontal/tabs:h-8 data-[variant=line]:rounded-none group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
