// `label` holds an i18n key; translate at render time
import { markRaw } from 'vue'
import { Building2Icon, CalendarIcon, ClockIcon, CreditCardIcon, GaugeIcon, GiftIcon, GlobeIcon, ListOrderedIcon, MessageCircleIcon, TabletIcon, TicketIcon, UserIcon, UsersIcon } from '@lucide/vue'

export const hospitalNavItems = [
  { label: 'nav.dashboard', to: '/hospital/dashboard', icon: markRaw(GaugeIcon) },
  { label: 'nav.hospital', to: '/myHospital', icon: markRaw(Building2Icon) },
  { label: 'nav.feedbacks', to: '/hospital/feedbacks', icon: markRaw(MessageCircleIcon) },
  { label: 'nav.doctors', to: '/hospital/doctors', icon: markRaw(UserIcon) },
  { label: 'queue.nav', to: '/hospital/queue', icon: markRaw(ListOrderedIcon) },
  { label: 'nav.appointments', to: '/hospital/appointments', icon: markRaw(TicketIcon) },
  { label: 'nav.calendar', to: '/hospital/calendar', icon: markRaw(CalendarIcon) },
  { label: 'nav.promotions', to: '/hospital/promotion', icon: markRaw(GiftIcon) },
  { label: 'kiosks.nav', to: '/hospital/kiosks', icon: markRaw(TabletIcon) },
  { label: 'team.nav', to: '/hospital/team', icon: markRaw(UsersIcon) },
  { label: 'siteEditor.title', to: '/hospital/site', icon: markRaw(GlobeIcon) },
  { label: 'dashLayout.subscription', to: '/hospital/service', icon: markRaw(CreditCardIcon) }
]

export const doctorNavItems = [
  { label: 'nav.dashboard', to: '/doctor/dashboard', icon: markRaw(GaugeIcon) },
  { label: 'queue.nav', to: '/doctor/queue', icon: markRaw(ListOrderedIcon) },
  { label: 'nav.appointments', to: '/doctor/appointment', icon: markRaw(TicketIcon) },
  { label: 'nav.calendar', to: '/doctor/calendar', icon: markRaw(CalendarIcon) },
  { label: 'schedule.nav', to: '/doctor/schedule', icon: markRaw(ClockIcon) }
]

export const adminNavItems = [{ label: 'nav.dashboard', to: '/admin/dashboard', icon: markRaw(GaugeIcon) }]
