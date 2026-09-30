import { markRaw } from 'vue'
import { BanIcon, CheckCheckIcon, CheckCircle2Icon, ClockIcon, MapPinCheckIcon, UserXIcon, XCircleIcon } from '@lucide/vue'

// Single source of truth for how an AppointmentStatus enum value (Pending,
// Confirmed, Canceled, Rejected, Missing - see backend/prisma/schema.prisma)
// is displayed. Previously duplicated ad hoc in Dashboard.vue, Appointment.vue
// and CalendarView.vue - kept here so all three (plus any future call site)
// stay in sync.
export type AppointmentStatusValue =
  | 'Pending'
  | 'Confirmed'
  | 'Arrived'
  | 'Completed'
  | 'Canceled'
  | 'Rejected'
  | 'Missing'
export type BadgeTone = 'warning' | 'success' | 'neutral' | 'destructive' | 'info'

export const statusTone: Record<string, BadgeTone> = {
  Pending: 'warning',
  Confirmed: 'success',
  Arrived: 'info',
  Completed: 'neutral',
  Canceled: 'neutral',
  Rejected: 'destructive',
  Missing: 'info'
}

// Friendlier copy than the raw enum value - purely a display label, the
// enum values themselves (and what's stored/sent to the API) are unchanged.
export const statusLabel: Record<string, string> = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  Arrived: 'Checked in',
  Completed: 'Completed',
  Canceled: 'Cancelled',
  Rejected: 'Declined',
  Missing: 'No-show'
}

// i18n keys (namespace `appointmentStatus`, see locales/*/userArea.ts) for the
// same labels. Inside a component prefer `translateStatus(t, status)` so the
// label follows the active locale; `statusLabel` above stays English-only for
// backward compatibility.
export const statusLabelKey: Record<string, string> = {
  Pending: 'appointmentStatus.pending',
  Confirmed: 'appointmentStatus.confirmed',
  Arrived: 'appointmentStatus.arrived',
  Completed: 'appointmentStatus.completed',
  Canceled: 'appointmentStatus.canceled',
  Rejected: 'appointmentStatus.rejected',
  Missing: 'appointmentStatus.missing'
}

export const translateStatus = (t: (key: string) => string, status: string) =>
  statusLabelKey[status] ? t(statusLabelKey[status]) : status

export const statusIcon: Record<string, unknown> = {
  Pending: markRaw(ClockIcon),
  Confirmed: markRaw(CheckCircle2Icon),
  Arrived: markRaw(MapPinCheckIcon),
  Completed: markRaw(CheckCheckIcon),
  Canceled: markRaw(XCircleIcon),
  Rejected: markRaw(BanIcon),
  Missing: markRaw(UserXIcon)
}
