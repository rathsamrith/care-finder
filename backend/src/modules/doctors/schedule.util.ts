import { BadRequestException } from '@nestjs/common';

// A doctor's weekly working hours: per weekday (0 = Sunday ... 6 = Saturday),
// one or more intervals (two intervals = a lunch break).
//
// A doctor with NO schedule rows at all follows the hospital's opening hours
// every day (the behaviour before schedules existed). Once any row exists,
// days without rows are days off.

export interface Interval {
  start: number; // minutes since midnight
  end: number;
}

export interface ScheduleRow {
  weekday: number;
  startTime: Date;
  endTime: Date;
}

export interface DayInput {
  weekday: number;
  intervals: { start: string; end: string }[];
}

export const MAX_INTERVALS_PER_DAY = 4;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const minutesOfTime = (time: Date) => time.getUTCHours() * 60 + time.getUTCMinutes();
export const formatHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const toTimeDate = (minutes: number) => new Date(`1970-01-01T${formatHHMM(minutes)}:00.000Z`);

// appointmentDate is a plain date stored at UTC midnight, so its UTC weekday is
// the calendar weekday.
export const weekdayOf = (date: Date) => date.getUTCDay();

export function intervalsFor(rows: ScheduleRow[], weekday: number): Interval[] {
  return rows
    .filter((r) => r.weekday === weekday)
    .map((r) => ({ start: minutesOfTime(r.startTime), end: minutesOfTime(r.endTime) }))
    .sort((a, b) => a.start - b.start);
}

// A booking must sit inside ONE interval - it cannot straddle a lunch break.
export const isWithinIntervals = (intervals: Interval[], range: readonly [number, number]) =>
  intervals.some((i) => range[0] >= i.start && range[1] <= i.end);

export const describeIntervals = (intervals: Interval[]) =>
  intervals.map((i) => `${formatHHMM(i.start)}-${formatHHMM(i.end)}`).join(', ');

// Keeps only the part of each interval that falls inside the hospital's hours.
export function clipIntervals(intervals: Interval[], open: number | null, close: number | null): Interval[] {
  if (open === null || close === null) return intervals;
  return intervals
    .map((i) => ({ start: Math.max(i.start, open), end: Math.min(i.end, close) }))
    .filter((i) => i.end > i.start);
}

// Validates client input and returns rows ready to store. Throws 400 with a
// message that says what to fix.
export function parseSchedule(days: unknown): { weekday: number; start: Date; end: Date }[] {
  if (!Array.isArray(days) || days.length > 7) {
    throw new BadRequestException('days must be a list with at most one entry per weekday');
  }
  const seen = new Set<number>();
  const rows: { weekday: number; start: Date; end: Date }[] = [];

  for (const day of days as DayInput[]) {
    const weekday = day?.weekday;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new BadRequestException('weekday must be a whole number from 0 (Sunday) to 6 (Saturday)');
    }
    if (seen.has(weekday)) throw new BadRequestException(`Weekday ${weekday} is listed twice`);
    seen.add(weekday);

    const intervals = day.intervals;
    if (!Array.isArray(intervals) || intervals.length > MAX_INTERVALS_PER_DAY) {
      throw new BadRequestException(`A day can have at most ${MAX_INTERVALS_PER_DAY} time ranges`);
    }

    const parsed = intervals
      .map((i) => {
        const a = typeof i?.start === 'string' ? TIME_RE.exec(i.start) : null;
        const b = typeof i?.end === 'string' ? TIME_RE.exec(i.end) : null;
        if (!a || !b) throw new BadRequestException('Times must be in HH:mm format');
        const start = Number(a[1]) * 60 + Number(a[2]);
        const end = Number(b[1]) * 60 + Number(b[2]);
        if (end <= start) throw new BadRequestException(`End time must be after start time (${i.start}-${i.end})`);
        return { start, end };
      })
      .sort((x, y) => x.start - y.start);

    parsed.forEach((i, index) => {
      if (index > 0 && i.start < parsed[index - 1].end) {
        throw new BadRequestException('Time ranges on the same day cannot overlap');
      }
      rows.push({ weekday, start: toTimeDate(i.start), end: toTimeDate(i.end) });
    });
  }
  return rows;
}

// Stored rows -> the shape the API returns / the editor edits.
export function groupByWeekday(rows: ScheduleRow[]): DayInput[] {
  const byDay = new Map<number, Interval[]>();
  for (const r of rows) {
    const list = byDay.get(r.weekday) ?? [];
    list.push({ start: minutesOfTime(r.startTime), end: minutesOfTime(r.endTime) });
    byDay.set(r.weekday, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, list]) => ({
      weekday,
      intervals: list.sort((a, b) => a.start - b.start).map((i) => ({ start: formatHHMM(i.start), end: formatHHMM(i.end) })),
    }));
}
