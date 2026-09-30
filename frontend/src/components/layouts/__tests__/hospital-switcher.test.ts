import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

import HospitalSwitcher from '../hospital-switcher.vue'

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })

function render(roles: string[], hospitals: { id: number; name: string }[], activeId?: number) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.roles = roles
  auth.hospitals = hospitals
  auth.hospital = activeId ? hospitals.find((h) => h.id === activeId) : undefined
  return mount(HospitalSwitcher, { global: { plugins: [pinia, i18n, router] } })
}

describe('HospitalSwitcher', () => {
  const two = [
    { id: 1, name: 'Sunrise General' },
    { id: 2, name: 'Angkor Clinic' }
  ]

  it('shows the active hospital by name for hospital accounts', () => {
    expect(render(['hospital'], two, 2).text()).toContain('Angkor Clinic')
    expect(render(['hospital'], two).text()).toContain('Sunrise General') // falls back to the first
  })

  it('is also shown with a single hospital (it offers "Add hospital")', () => {
    expect(render(['hospital'], [two[0]]).find('button').exists()).toBe(true)
  })

  it('is hidden for other roles and for accounts without a hospital', () => {
    expect(render(['doctor'], two).find('button').exists()).toBe(false)
    expect(render(['admin'], two).find('button').exists()).toBe(false)
    expect(render(['hospital'], []).find('button').exists()).toBe(false)
  })
})
