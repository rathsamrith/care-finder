import {
  buildSlots,
  formatMinutes,
  isInPast,
  isWithinHours,
  minutesOf,
  overlaps,
  resolveRange,
  wallClockNow,
} from './availability.util';

const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

describe('resolveRange', () => {
  it('uses the explicit end when given', () => {
    expect(resolveRange(t('09:00'), t('10:15'))).toEqual([540, 615]);
  });
  it('falls back to one default slot', () => {
    expect(resolveRange(t('09:00'), null, 30)).toEqual([540, 570]);
  });
});

describe('overlaps', () => {
  it('detects overlap, containment and identical ranges', () => {
    expect(overlaps([540, 570], [560, 600])).toBe(true);
    expect(overlaps([540, 600], [550, 560])).toBe(true);
    expect(overlaps([540, 570], [540, 570])).toBe(true);
  });
  it('treats back-to-back bookings as free', () => {
    expect(overlaps([540, 570], [570, 600])).toBe(false);
    expect(overlaps([570, 600], [540, 570])).toBe(false);
  });
});

describe('isWithinHours', () => {
  it('enforces opening hours and allows anything when hours are unset', () => {
    expect(isWithinHours(t('08:00'), t('17:00'), [540, 570])).toBe(true);
    expect(isWithinHours(t('08:00'), t('17:00'), [420, 450])).toBe(false);
    expect(isWithinHours(t('08:00'), t('17:00'), [1000, 1030])).toBe(false); // ends after close
    expect(isWithinHours(null, null, [0, 30])).toBe(true);
  });
  it('allows a booking that ends exactly at closing', () => {
    expect(isWithinHours(t('08:00'), t('17:00'), [990, 1020])).toBe(true); // 16:30-17:00
    expect(isWithinHours(t('08:00'), t('17:00'), [480, 510])).toBe(true); // starts exactly at opening
  });
});

describe('wallClockNow / isInPast', () => {
  // 2026-10-01T03:00:00Z is 10:00 in UTC+7
  const now = wallClockNow(Date.parse('2026-10-01T03:00:00Z'), 420);
  it('shifts "now" to the hospital wall clock', () => {
    expect(minutesOf(now)).toBe(600);
  });
  it('compares date + time against it', () => {
    expect(isInPast(d('2026-10-01'), t('09:30'), now)).toBe(true);
    expect(isInPast(d('2026-10-01'), t('10:30'), now)).toBe(false);
    expect(isInPast(d('2026-09-30'), t('23:00'), now)).toBe(true);
    expect(isInPast(d('2026-10-02'), t('00:00'), now)).toBe(false);
  });
});

describe('buildSlots', () => {
  const win = (from: string, to: string) => ({ start: minutesOf(t(from)), end: minutesOf(t(to)) });

  it('marks busy and past slots unavailable', () => {
    const slots = buildSlots([win('08:00', '10:00')], [[510, 540]], 30, 480);
    expect(slots.map((s) => s.time)).toEqual(['08:00', '08:30', '09:00', '09:30']);
    // 08:30-09:00 is busy; nothing is before 08:00 here
    expect(slots.map((s) => s.available)).toEqual([true, false, true, true]);
    const withPast = buildSlots([win('08:00', '10:00')], [], 30, 540);
    expect(withPast.map((s) => s.available)).toEqual([false, false, true, true]);
  });

  it('leaves a gap for a lunch break (several working windows)', () => {
    const slots = buildSlots([win('08:00', '09:00'), win('10:00', '11:00')], [], 30);
    expect(slots.map((s) => s.time)).toEqual(['08:00', '08:30', '10:00', '10:30']);
  });

  it('a day off (no windows) has no slots, and a window shorter than a slot has none', () => {
    expect(buildSlots([], [], 30)).toEqual([]);
    expect(buildSlots([win('08:00', '08:20')], [], 30)).toEqual([]);
  });

  it('formats minutes', () => {
    expect(formatMinutes(605)).toBe('10:05');
  });
});
