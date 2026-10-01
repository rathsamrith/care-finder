import { useAuthStore } from '@/stores/auth-store'

export type Role = 'user' | 'hospital' | 'doctor' | 'admin'

type Granted = string | string[] | null | undefined

const toList = (value: Granted): string[] => (Array.isArray(value) ? value : value ? [value] : [])

/** True when `roles` satisfies a route's allowed list (admins pass everywhere; no list = open). */
export function canAccessRoles(roles: Granted, allowed: string[] | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  const mine = toList(roles)
  return mine.includes('admin') || allowed.some((role) => mine.includes(role))
}

/**
 * Reactive ACL over the auth store. Reads the store on every call, so it can
 * never serve a previous account's permissions after logout or a user switch.
 */
export function useAcl() {
  const store = useAuthStore()
  return {
    hasRole: (...wanted: string[]) => wanted.some((role) => toList(store.roles).includes(role)),
    can: (...permissions: string[]) => permissions.every((p) => toList(store.permissions).includes(p)),
    canAny: (...permissions: string[]) => permissions.some((p) => toList(store.permissions).includes(p)),
    canAccess: (allowed?: string[]) => canAccessRoles(store.roles, allowed)
  }
}
