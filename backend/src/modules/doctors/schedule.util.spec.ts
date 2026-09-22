import { BadRequestException } from '@nestjs/common';
import {
  clipIntervals,
  describeIntervals,
  groupByWeekday,
  intervalsFor,
  isWithinIntervals,
  parseSchedule,
  weekdayOf,
} from './schedule.util';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const row = (weekday: number, start: string, end: string) => ({ weekday, startTime: t(start), endTime: t(end) });

describe('weekdayOf', () => {
  it('reads the calendar weekday of a date stored at UTC midnight', () => {
    expect(weekdayOf(new Date('2026-10-04T00:00:00.000Z'))).toBe(0); // Sunday
    expect(weekdayOf(new Date('2026-10-05T00:00:00.000Z'))).toBe(1); // Monday
    expect(weekdayOf(new Date('2026-10-10T00:00:00.000Z'))).toBe(6); // Saturday
  });
});

describe('intervals', () => {
  const rows = [row(1, '14:00', '17:00'), row(1, '08:00', '12:00'), row(3, '09:00', '11:00')];

  it('returns a day sorted by start, and nothing for a day off', () => {
    expect(intervalsFor(rows, 1)).toEqual([{ start: 480, end: 720 }, { start: 840, end: 1020 }]);
    expect(intervalsFor(rows, 2)).toEqual([]);
  });

  it('a booking must fit inside a single interval (not straddle a lunch break)', () => {
    const monday = intervalsFor(rows, 1);
    expect(isWithinIntervals(monday, [480, 510])).toBe(true);
    expect(isWithinIntervals(monday, [690, 720])).toBe(true); // ends exactly at 12:00
    expect(isWithinIntervals(monday, [700, 740])).toBe(false); // crosses into the break
    expect(isWithinIntervals(monday, [730, 760])).toBe(false); // inside the break
    expect(isWithinIntervals(monday, [840, 870])).toBe(true);
  });

  it('describes intervals for error messages', () => {
    expect(describeIntervals(intervalsFor(rows, 1))).toBe('08:00-12:00, 14:00-17:00');
  });

  it('clips to hospital opening hours, dropping intervals outside them', () => {
    const day = [{ start: 420, end: 720 }, { start: 1080, end: 1200 }];
    expect(clipIntervals(day, 480, 1020)).toEqual([{ start: 480, end: 720 }]);
    expect(clipIntervals(day, null, null)).toEqual(day);
  });
});

describe('parseSchedule', () => {
  const ok = (days: unknown) => parseSchedule(days);
  const bad = (days: unknown, message: RegExp) => {
    expect(() => parseSchedule(days)).toThrow(BadRequestException);
    expect(() => parseSchedule(days)).toThrow(message);
  };

  it('accepts a normal week, including a split day, and stores times as HH:mm dates', () => {
    const rows = ok([
      { weekday: 1, intervals: [{ start: '14:00', end: '17:00' }, { start: '08:00', end: '12:00' }] },
      { weekday: 6, intervals: [] }, // listed but no hours = off
    ]);
    expect(rows.map((r) => [r.weekday, r.start.toISOString().slice(11, 16), r.end.toISOString().slice(11, 16)])).toEqual([
      [1, '08:00', '12:00'],
      [1, '14:00', '17:00'],
    ]);
  });

  it('rejects malformed input', () => {
    bad('nope', /list/);
    bad(Array.from({ length: 8 }, (_, i) => ({ weekday: i % 7, intervals: [] })), /at most one entry/);
    bad([{ weekday: 7, intervals: [] }], /weekday must be/);
    bad([{ weekday: 1.5, intervals: [] }], /weekday must be/);
    bad([{ weekday: 1, intervals: [] }, { weekday: 1, intervals: [] }], /twice/);
    bad([{ weekday: 1, intervals: 'x' }], /at most 4/);
    bad([{ weekday: 1, intervals: [{ start: '8:00', end: '12:00' }] }], /HH:mm/);
    bad([{ weekday: 1, intervals: [{ start: '08:00', end: '25:00' }] }], /HH:mm/);
    bad([{ weekday: 1, intervals: [{ start: '08:00' }] }], /HH:mm/);
  });

  it('rejects backwards, zero-length and overlapping ranges, and too many per day', () => {
    bad([{ weekday: 1, intervals: [{ start: '12:00', end: '08:00' }] }], /after start/);
    bad([{ weekday: 1, intervals: [{ start: '08:00', end: '08:00' }] }], /after start/);
    bad([{ weekday: 1, intervals: [{ start: '08:00', end: '12:00' }, { start: '11:00', end: '15:00' }] }], /overlap/);
    const five = Array.from({ length: 5 }, (_, i) => ({ start: `0${i}:00`, end: `0${i}:30` }));
    bad([{ weekday: 1, intervals: five }], /at most 4/);
  });

  it('allows back-to-back ranges (end == next start)', () => {
    expect(() => ok([{ weekday: 1, intervals: [{ start: '08:00', end: '12:00' }, { start: '12:00', end: '15:00' }] }])).not.toThrow();
  });
});

describe('groupByWeekday', () => {
  it('turns stored rows into the editor shape, sorted', () => {
    expect(groupByWeekday([row(3, '09:00', '11:00'), row(1, '14:00', '17:00'), row(1, '08:00', '12:00')])).toEqual([
      { weekday: 1, intervals: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '17:00' }] },
      { weekday: 3, intervals: [{ start: '09:00', end: '11:00' }] },
    ]);
  });
});
