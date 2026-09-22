// Appointment times are stored as wall-clock values on a fixed 1970-01-01
// epoch (see AppointmentsService.parseTime), and appointmentDate as a plain
// date. So all comparisons here work on minutes-since-midnight read from the
// UTC fields, never on real instants - except "now", which is converted to the
// hospital's wall clock via APP_UTC_OFFSET_MINUTES (default +420, Phnom Penh).

export type MinuteRange = readonly [start: number, end: number];

export const slotMinutes = () => {
  const n = Number(process.env.APPOINTMENT_SLOT_MINUTES);
  return Number.isInteger(n) && n >= 5 && n <= 240 ? n : 30;
};

export const utcOffsetMinutes = () => {
  const n = Number(process.env.APP_UTC_OFFSET_MINUTES);
  return Number.isFinite(n) ? n : 420;
};

export const minutesOf = (time: Date): number => time.getUTCHours() * 60 + time.getUTCMinutes();

export const formatMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// A booking without an explicit end occupies one default slot.
export function resolveRange(start: Date, end: Date | null | undefined, slot = slotMinutes()): MinuteRange {
  const s = minutesOf(start);
  return [s, end ? minutesOf(end) : s + slot];
}

export const overlaps = (a: MinuteRange, b: MinuteRange): boolean => a[0] < b[1] && b[0] < a[1];

// Hospitals without both hours set are treated as always open (no data to enforce).
export function isWithinHours(open: Date | null, close: Date | null, range: MinuteRange): boolean {
  if (!open || !close) return true;
  return range[0] >= minutesOf(open) && range[1] <= minutesOf(close);
}

// "Now" expressed as the same wall-clock-on-UTC representation the DB uses.
export const wallClockNow = (now = Date.now(), offset = utcOffsetMinutes()): Date => new Date(now + offset * 60_000);

// True when the booking's start (date + time) is before the wall-clock now.
export function isInPast(date: Date, time: Date, now = wallClockNow()): boolean {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.getUTCHours(), time.getUTCMinutes());
  return start < now.getTime();
}

export interface Slot {
  time: string;
  available: boolean;
}

// Free/busy grid for one doctor-day: steps by `slot` minutes through each
// working window (several windows = a lunch break), marking taken and past slots.
export function buildSlots(
  windows: { start: number; end: number }[],
  busy: MinuteRange[],
  slot = slotMinutes(),
  pastBefore?: number,
): Slot[] {
  const slots: Slot[] = [];
  for (const window of windows) {
    for (let start = window.start; start + slot <= window.end; start += slot) {
      const range: MinuteRange = [start, start + slot];
      const taken = busy.some((b) => overlaps(range, b));
      const past = pastBefore !== undefined && start < pastBefore;
      slots.push({ time: formatMinutes(start), available: !taken && !past });
    }
  }
  return slots;
}
