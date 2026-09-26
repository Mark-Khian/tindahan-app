import { formatInTimeZone } from 'date-fns-tz'
import { BUSINESS_DAY_CUTOFF_HOUR, TIMEZONE } from './constants'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Business date (YYYY-MM-DD) for a moment in time, using a 4:00 AM Asia/Manila cut-off.
 * Manila has no DST, so shifting by the cut-off before formatting is exact.
 */
export function getBusinessDate(date: Date): string {
  const shifted = new Date(date.getTime() - BUSINESS_DAY_CUTOFF_HOUR * HOUR_MS)
  return formatInTimeZone(shifted, TIMEZONE, 'yyyy-MM-dd')
}

function parseDateString(businessDate: string): Date {
  const [y, m, d] = businessDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(businessDate: string, days: number): string {
  const date = new Date(parseDateString(businessDate).getTime() + days * DAY_MS)
  return date.toISOString().slice(0, 10)
}

export const DAY_NAMES = ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado']
const MONTH_NAMES = ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis']

/** Every date shown to the user goes through here, e.g. "Sabado, Set 26, 2026". */
export function formatBusinessDate(businessDate: string): string {
  const date = parseDateString(businessDate)
  return `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

export function formatTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'h:mm a')
}

/** Manila calendar date and time, e.g. "Sabado, Set 26, 2026, 10:02 PM". */
export function formatDateTime(date: Date): string {
  return `${formatBusinessDate(formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd'))}, ${formatTime(date)}`
}
