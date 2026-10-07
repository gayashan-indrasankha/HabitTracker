import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  differenceInCalendarDays,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  differenceInCalendarDays,
  subDays,
  addMonths,
  subMonths,
};

/**
 * Get the current date in the user's timezone as a plain Date
 * where year/month/day match the user's local date.
 */
export function getTodayInTimezone(timezone: string): Date {
  const now = new Date();
  return toZonedTime(now, timezone);
}

/**
 * Format a date as YYYY-MM-DD (used for DB storage)
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD string to a Date object
 */
export function fromDateString(dateStr: string): Date {
  return parseISO(dateStr);
}

/**
 * Get all days in a given month (by year and month number 1-12)
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

/**
 * Get a display label for a year-month string like "2026-09"
 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
}

/**
 * Get year and month number from a YYYY-MM string
 */
export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    throw new Error('Invalid month');
  }
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
}

export function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 100;
}

/**
 * Get current YYYY-MM string
 */
export function currentYearMonth(timezone = 'UTC'): string {
  const today = getTodayInTimezone(timezone);
  return format(today, 'yyyy-MM');
}

/**
 * Navigate to previous month
 */
export function prevMonth(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth);
  const prev = subMonths(new Date(year, month - 1, 1), 1);
  return format(prev, 'yyyy-MM');
}

/**
 * Navigate to next month
 */
export function nextMonth(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth);
  const next = addMonths(new Date(year, month - 1, 1), 1);
  return format(next, 'yyyy-MM');
}

export { toZonedTime, fromZonedTime };
