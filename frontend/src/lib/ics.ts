// A minimal iCalendar (.ics) event for "Add to calendar". Times are written as
// "floating" local times (no timezone): the appointment is at 10:00 where the
// hospital is, and a phone that adds it there shows 10:00.
export interface IcsEvent {
  uid: string
  title: string
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end?: string | null // HH:mm; defaults to start + defaultMinutes
  location?: string | null
  description?: string | null
  alarmMinutes?: number // reminder before the start (default 60)
  defaultMinutes?: number // length when no end is known (default 30)
}

const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines over 75 octets must be folded: CRLF + one space continues the line.
// Split on characters (never inside a multi-byte one) so Khmer text stays intact.
function fold(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74 // continuation lines start with a space
    if (encoder.encode(current + ch).length > limit) {
      parts.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`

const addMinutes = (time: string, minutes: number) => {
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function buildIcs(event: IcsEvent, now: Date = new Date()): string {
  const end = event.end && event.end > event.start ? event.end : addMinutes(event.start, event.defaultMinutes ?? 30)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Care Finder//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@carefinder`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${stamp(event.date, event.start)}`,
    `DTEND:${stamp(event.date, end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(event.title)}`,
    `TRIGGER:-PT${event.alarmMinutes ?? 60}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
