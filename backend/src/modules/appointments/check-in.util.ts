import { createHmac, timingSafeEqual } from 'crypto';
import { wallClockNow } from './availability.util';

// ---- check-in code -----------------------------------------------------------
// One stable code per appointment, shown as a QR and as text: "K3-7QMP-2XDT" =
// appointment id (base 36) + 8 characters of an HMAC over that id. Nothing is
// stored: the server recomputes it. Being able to produce a valid code proves the
// caller was handed it by the owner (or guessed 40 bits, behind a rate limit).
// It is NOT what limits when a check-in works - the time window and the
// appointment's status do that.

// No 0/O/1/I/L so it survives being read aloud or typed from a screen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SIGNATURE_LENGTH = 8;

const secretKey = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return secret;
};

function signature(appointmentId: bigint, secret: string): string {
  const digest = createHmac('sha256', secret).update(`check-in:${appointmentId}`).digest();
  let out = '';
  for (let i = 0; i < SIGNATURE_LENGTH; i++) out += ALPHABET[digest[i] % ALPHABET.length];
  return out;
}

export function checkInCode(appointmentId: bigint, secret = secretKey()): string {
  const sig = signature(appointmentId, secret);
  return `${appointmentId.toString(36).toUpperCase()}-${sig.slice(0, 4)}-${sig.slice(4)}`;
}

// Returns the appointment id if `input` is a valid code, else null. Tolerates
// lowercase, spaces and missing dashes (people type these).
export function parseCheckInCode(input: string, secret = secretKey()): bigint | null {
  const cleaned = String(input ?? '').toUpperCase().replace(/[\s-]+/g, '');
  if (cleaned.length <= SIGNATURE_LENGTH || cleaned.length > SIGNATURE_LENGTH + 14) return null;

  const idPart = cleaned.slice(0, cleaned.length - SIGNATURE_LENGTH);
  const sigPart = cleaned.slice(-SIGNATURE_LENGTH);
  if (!/^[0-9A-Z]+$/.test(idPart)) return null;

  let id = 0n;
  for (const ch of idPart) id = id * 36n + BigInt(parseInt(ch, 36));
  if (id <= 0n) return null;

  const expected = signature(id, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sigPart);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

// ---- check-in window -----------------------------------------------------------
export const checkInEarlyMinutes = () => positiveInt(process.env.CHECKIN_EARLY_MINUTES, 60);
export const checkInLateMinutes = () => positiveInt(process.env.CHECKIN_LATE_MINUTES, 30);
export const noShowGraceMinutes = () => positiveInt(process.env.NO_SHOW_GRACE_MINUTES, 60);
// "Arrive by" shown on the patient's pass: this long before the appointment starts.
export const arriveEarlyMinutes = () => positiveInt(process.env.ARRIVE_EARLY_MINUTES, 15);

function positiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// appointmentDate/appointmentTime are wall-clock values stored as UTC (see
// availability.util.ts), so the start is built with Date.UTC and compared with
// the wall-clock "now".
export function appointmentStartMs(date: Date, time: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.getUTCHours(), time.getUTCMinutes());
}

export type CheckInState = 'early' | 'open' | 'late';

export function checkInState(
  date: Date,
  time: Date,
  now: Date = wallClockNow(),
  early = checkInEarlyMinutes(),
  late = checkInLateMinutes(),
): { state: CheckInState; opensAt: number; closesAt: number } {
  const start = appointmentStartMs(date, time);
  const opensAt = start - early * 60_000;
  const closesAt = start + late * 60_000;
  const t = now.getTime();
  return { state: t < opensAt ? 'early' : t > closesAt ? 'late' : 'open', opensAt, closesAt };
}

export function isSameWallClockDay(date: Date, now: Date = wallClockNow()): boolean {
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

// ---- distance ------------------------------------------------------------------
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const checkInRadiusMeters = () => positiveInt(process.env.CHECKIN_RADIUS_METERS, 1000);

// ---- queue ---------------------------------------------------------------------
export const queueLabel = (prefix: string | null | undefined, number: number | null | undefined) =>
  number ? `${prefix || 'Q'}-${number}` : null;

// Rough: people already checked in for the same doctor ahead of you, times the
// usual length of one appointment. Always shown as an estimate.
export const estimateWaitMinutes = (peopleAhead: number, minutesEach: number) => Math.max(0, peopleAhead) * minutesEach;

export const bookingReference = (appointmentId: bigint) => `CF-${appointmentId.toString().padStart(6, '0')}`;
