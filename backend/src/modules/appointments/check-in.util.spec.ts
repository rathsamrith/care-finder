import {
  appointmentStartMs,
  arriveEarlyMinutes,
  bookingReference,
  checkInCode,
  checkInState,
  distanceMeters,
  estimateWaitMinutes,
  isSameWallClockDay,
  parseCheckInCode,
  queueLabel,
} from './check-in.util';

const SECRET = 'test-secret';
const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const at = (iso: string) => new Date(iso); // a wall-clock "now" (stored as UTC digits)

describe('check-in code', () => {
  it('round-trips the appointment id', () => {
    for (const id of [1n, 35n, 36n, 2_147_483_647n, 123_456_789_012n]) {
      expect(parseCheckInCode(checkInCode(id, SECRET), SECRET)).toBe(id);
    }
  });

  it('looks like "ID-XXXX-XXXX" using unambiguous characters', () => {
    const code = checkInCode(42n, SECRET);
    expect(code).toMatch(/^[0-9A-Z]+-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code.split('-').slice(1).join('')).not.toMatch(/[01OIL]/);
  });

  it('is stable per appointment and differs between appointments', () => {
    expect(checkInCode(7n, SECRET)).toBe(checkInCode(7n, SECRET));
    expect(checkInCode(7n, SECRET)).not.toBe(checkInCode(8n, SECRET));
  });

  it('tolerates lowercase, spaces and missing dashes when typed', () => {
    const code = checkInCode(99n, SECRET);
    expect(parseCheckInCode(code.toLowerCase(), SECRET)).toBe(99n);
    expect(parseCheckInCode(` ${code.replace(/-/g, ' ')} `, SECRET)).toBe(99n);
    expect(parseCheckInCode(code.replace(/-/g, ''), SECRET)).toBe(99n);
  });

  it('rejects a forged, altered or foreign code', () => {
    const code = checkInCode(99n, SECRET);
    const [id, a, b] = code.split('-');
    expect(parseCheckInCode(`${id}-${a}-${b.slice(0, 3)}${b[3] === 'A' ? 'B' : 'A'}`, SECRET)).toBeNull(); // tampered signature
    expect(parseCheckInCode(`${(100n).toString(36).toUpperCase()}-${a}-${b}`, SECRET)).toBeNull(); // someone else's id
    expect(parseCheckInCode(checkInCode(99n, 'another-secret'), SECRET)).toBeNull(); // signed with another key
  });

  it('rejects junk input without throwing', () => {
    for (const junk of ['', '   ', 'abc', '---', '🙂🙂🙂🙂🙂🙂🙂🙂🙂', 'X'.repeat(200), null as any, undefined as any]) {
      expect(parseCheckInCode(junk, SECRET)).toBeNull();
    }
  });
});

describe('check-in window (60 min before .. 30 min after)', () => {
  const date = d('2026-10-05');
  const time = t('10:00');
  const state = (now: string) => checkInState(date, time, at(now), 60, 30).state;

  it('is early before it opens, open inside, late after it closes (edges inclusive)', () => {
    expect(state('2026-10-05T08:59:00.000Z')).toBe('early');
    expect(state('2026-10-05T09:00:00.000Z')).toBe('open');
    expect(state('2026-10-05T10:00:00.000Z')).toBe('open');
    expect(state('2026-10-05T10:30:00.000Z')).toBe('open');
    expect(state('2026-10-05T10:31:00.000Z')).toBe('late');
  });

  it('never opens a day early', () => {
    expect(state('2026-10-04T10:00:00.000Z')).toBe('early');
  });

  it('builds the start from date + wall-clock time', () => {
    expect(appointmentStartMs(date, time)).toBe(Date.parse('2026-10-05T10:00:00.000Z'));
  });

  it('knows whether a date is "today"', () => {
    expect(isSameWallClockDay(date, at('2026-10-05T23:59:00.000Z'))).toBe(true);
    expect(isSameWallClockDay(date, at('2026-10-06T00:00:00.000Z'))).toBe(false);
  });
});

describe('distance', () => {
  it('computes metres between coordinates', () => {
    expect(distanceMeters(11.5564, 104.9282, 11.5564, 104.9282)).toBeCloseTo(0, 5);
    // ~1.11 km per 0.01 degree of latitude
    expect(distanceMeters(11.55, 104.9, 11.56, 104.9)).toBeGreaterThan(1100);
    expect(distanceMeters(11.55, 104.9, 11.56, 104.9)).toBeLessThan(1120);
    // Phnom Penh to Siem Reap is roughly 230 km
    expect(distanceMeters(11.5564, 104.9282, 13.3671, 103.8448) / 1000).toBeGreaterThan(220);
  });
});

describe('queue', () => {
  it('formats the ticket label and leaves it empty before check-in', () => {
    expect(queueLabel('B', 14)).toBe('B-14');
    expect(queueLabel(null, 3)).toBe('Q-3');
    expect(queueLabel('B', null)).toBeNull();
  });

  it('estimates the wait as people ahead x minutes each, never negative', () => {
    expect(estimateWaitMinutes(2, 15)).toBe(30);
    expect(estimateWaitMinutes(0, 15)).toBe(0);
    expect(estimateWaitMinutes(-1, 15)).toBe(0);
  });
});

describe('pass details', () => {
  it('builds a stable, readable booking reference', () => {
    expect(bookingReference(7n)).toBe('CF-000007');
    expect(bookingReference(123456n)).toBe('CF-123456');
    expect(bookingReference(12345678n)).toBe('CF-12345678'); // never truncated
  });

  it('arrive-by lead time defaults to 15 minutes and can be configured', () => {
    expect(arriveEarlyMinutes()).toBe(15);
    process.env.ARRIVE_EARLY_MINUTES = '30';
    expect(arriveEarlyMinutes()).toBe(30);
    process.env.ARRIVE_EARLY_MINUTES = 'soon';
    expect(arriveEarlyMinutes()).toBe(15);
    delete process.env.ARRIVE_EARLY_MINUTES;
  });
});
