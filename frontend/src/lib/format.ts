// Appointment dates/times travel from the backend as either a plain
// 'YYYY-MM-DD' date or a fixed-epoch ISO time string like
// '1970-01-01T09:00:00.000Z' (appointment_time - see
// AppointmentsService.parseTime on the backend). The epoch date and 'Z'
// suffix there are just a storage convenience for a bare HH:mm wall-clock
// value, not a real instant - so both formatters read the digits directly
// instead of letting the browser convert through its local timezone, which
// would silently shift the displayed hour/date for any viewer not in UTC.

export function formatAppointmentDate(value?: string | Date | null): string {
  if (!value) return ''

  let year: number
  let month: number
  let day: number

  if (value instanceof Date) {
    year = value.getUTCFullYear()
    month = value.getUTCMonth() + 1
    day = value.getUTCDate()
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!match) return value
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
  }

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatAppointmentTime(value?: string | null): string {
  if (!value) return ''
  const match = /T(\d{2}):(\d{2})/.exec(value)
  if (!match) return value

  const hour = Number(match[1])
  const minute = match[2]
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = ((hour + 11) % 12) + 1
  return `${displayHour}:${minute} ${period}`
}
