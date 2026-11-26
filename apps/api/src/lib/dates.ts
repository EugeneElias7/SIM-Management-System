import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezonePlugin from 'dayjs/plugin/timezone.js';
import {
  addDaysToDateOnly,
  addYearsToDateOnly,
  dateOnlyFromDate,
  daysUntilDateOnly,
  parseDateOnlyUTC,
  todayDateOnly,
} from '@san/shared';
import { env } from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

export function toDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDateOnlyUTC(value.slice(0, 10));
}

export function fromDbDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return dateOnlyFromDate(value);
}

export function today(): string {
  return todayDateOnly(new Date(), env.APP_TIMEZONE);
}

export function daysRemaining(expiryDate: string | null): number | null {
  return daysUntilDateOnly(expiryDate, new Date(), env.APP_TIMEZONE);
}

export function addDays(dateOnly: string, days: number): string {
  return addDaysToDateOnly(dateOnly, days);
}

export function addYears(dateOnly: string, years: number): string {
  return addYearsToDateOnly(dateOnly, years);
}

export function monthStart(dateOnly: string): string {
  return `${dateOnly.slice(0, 7)}-01`;
}

export function addMonthsToDateOnly(dateOnly: string, months: number): string {
  return dayjs.utc(dateOnly).add(months, 'month').format('YYYY-MM-DD');
}

export function nowTimestamp(): Date {
  return new Date();
}

/** Human-readable timestamp, used in emails and docs. */
export function formatTimestamp(value: Date | string, pattern = 'DD MMM YYYY, hh:mm A'): string {
  return dayjs(value).tz(env.APP_TIMEZONE).format(pattern);
}

export { dayjs };
