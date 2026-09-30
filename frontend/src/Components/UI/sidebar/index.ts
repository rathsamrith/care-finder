import type { VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'vue'
import { cva } from 'class-variance-authority'

export interface SidebarProps {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
  class?: HTMLAttributes['class']
}

export { default as Sidebar } from './sidebar.vue'
export { default as SidebarContent } from './sidebar-content.vue'
export { default as SidebarFooter } from './sidebar-footer.vue'
export { default as SidebarGroup } from './sidebar-group.vue'
export { default as SidebarGroupAction } from './sidebar-group-action.vue'
export { default as SidebarGroupContent } from './sidebar-group-content.vue'
export { default as SidebarGroupLabel } from './sidebar-group-label.vue'
export { default as SidebarHeader } from './sidebar-header.vue'
export { default as SidebarInput } from './sidebar-input.vue'
export { default as SidebarInset } from './sidebar-inset.vue'
export { default as SidebarMenu } from './sidebar-menu.vue'
export { default as SidebarMenuAction } from './sidebar-menu-action.vue'
export { default as SidebarMenuBadge } from './sidebar-menu-badge.vue'
export { default as SidebarMenuButton } from './sidebar-menu-button.vue'
export { default as SidebarMenuItem } from './sidebar-menu-item.vue'
export { default as SidebarMenuSkeleton } from './sidebar-menu-skeleton.vue'
export { default as SidebarMenuSub } from './sidebar-menu-sub.vue'
export { default as SidebarMenuSubButton } from './sidebar-menu-sub-button.vue'
export { default as SidebarMenuSubItem } from './sidebar-menu-sub-item.vue'
export { default as SidebarProvider } from './sidebar-provider.vue'
export { default as SidebarRail } from './sidebar-rail.vue'
export { default as SidebarSeparator } from './sidebar-separator.vue'
export { default as SidebarTrigger } from './sidebar-trigger.vue'

export { useSidebar } from './utils'

export const sidebarMenuButtonVariants = cva(
  'ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-left text-sm transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-active:font-medium peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline: 'bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type SidebarMenuButtonVariants = VariantProps<typeof sidebarMenuButtonVariants>
