import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Avatar } from './avatar.vue'
export { default as AvatarBadge } from './avatar-badge.vue'
export { default as AvatarFallback } from './avatar-fallback.vue'
export { default as AvatarGroup } from './avatar-group.vue'
export { default as AvatarGroupCount } from './avatar-group-count.vue'
export { default as AvatarImage } from './avatar-image.vue'

export const avatarVariants = cva(
  'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6 group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
  {
    variants: {
      size: {
        sm: '',
        default: '',
        lg: '',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export type AvatarVariants = VariantProps<typeof avatarVariants>
