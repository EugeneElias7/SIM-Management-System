import type { ValidityStatus } from './enums.js';

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateOnlyUTC(value: string | null | undefined): Date | null {
  if (!value || !isValidDateOnly(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export function dateOnlyFromDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Returns the current calendar date in the given IANA timezone.
 * `en-CA` reliably produces YYYY-MM-DD.
 */
export function todayDateOnly(now: Date = new Date(), timeZone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Calendar-day difference between an expiry date and the current date in a timezone. */
export function daysUntilDateOnly(
  dateOnly: string | null | undefined,
  now: Date = new Date(),
  timeZone = 'Asia/Kolkata',
): number | null {
  if (!dateOnly || !isValidDateOnly(dateOnly)) return null;
  const today = todayDateOnly(now, timeZone);
  const target = Date.parse(`${dateOnly}T00:00:00.000Z`);
  const current = Date.parse(`${today}T00:00:00.000Z`);
  return Math.round((target - current) / 86_400_000);
}

export function addYearsToDateOnly(dateOnly: string, years: number): string {
  if (!isValidDateOnly(dateOnly)) return dateOnly;
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateOnly;
  let targetYear = year + years;
  let targetDay = day;
  if (month === 2 && day === 29) {
    const isLeap = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0);
    if (!isLeap) targetDay = 28;
  }
  const candidate = `${targetYear}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  return isValidDateOnly(candidate) ? candidate : dateOnly;
}
export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const parsed = parseDateOnlyUTC(dateOnly);
  if (!parsed) return dateOnly;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return dateOnlyFromDate(parsed);
}

export function getValidityStatus(
  expiryDate: string | null | undefined,
  warningDays = 30,
  now: Date = new Date(),
  timeZone = 'Asia/Kolkata',
): ValidityStatus {
  const days = daysUntilDateOnly(expiryDate, now, timeZone);
  if (days === null) return 'UNKNOWN';
  if (days < 0) return 'EXPIRED';
  if (days <= warningDays) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function humanDate(dateOnly: string | null | undefined): string {
  if (!dateOnly) return '—';
  const parsed = parseDateOnlyUTC(dateOnly);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
