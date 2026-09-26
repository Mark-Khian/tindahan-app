import { formatInTimeZone } from 'date-fns-tz'
import { addDays, DAY_NAMES } from './businessDate'
import { TIMEZONE } from './constants'
import { fromCentavos, toCentavos } from './money'

export type AnalyticsRange = '7d' | '30d' | 'month'

export interface AnalyticsSale {
  item_key: string
  item_name: string
  qty: number
  subtotal: number
  payment_type: 'cash' | 'utang'
  recorded_by: string
  recorded_at: Date
  business_date: string
  voided: boolean
}

const DEFAULT_FIRST_HOUR = 6
const DEFAULT_LAST_HOUR = 22

const active = (sales: readonly AnalyticsSale[]) => sales.filter((s) => !s.voided)

/** Avoids float drift when summing fractional quantities (e.g. 0.25 kg). */
const roundQty = (qty: number) => Math.round(qty * 1000) / 1000

function weekdayOf(businessDate: string): number {
  const [y, m, d] = businessDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Business dates (YYYY-MM-DD, ascending) covered by a range, always ending with `today`. */
export function getRangeDates(today: string, range: AnalyticsRange): string[] {
  const start =
    range === 'month' ? `${today.slice(0, 8)}01` : addDays(today, range === '7d' ? -6 : -29)
  const dates: string[] = []
  for (let d = start; d <= today; d = addDays(d, 1)) dates.push(d)
  return dates
}

export interface SalesSummary {
  gross: number
  count: number
  avgPerDay: number
  cash: number
  utang: number
}

/** Average is gross divided by every date in the range, including days without sales and today. */
export function summarize(sales: readonly AnalyticsSale[], dates: readonly string[]): SalesSummary {
  let gross = 0
  let cash = 0
  let count = 0
  for (const s of active(sales)) {
    const c = toCentavos(s.subtotal)
    gross += c
    if (s.payment_type === 'cash') cash += c
    count++
  }
  return {
    gross: fromCentavos(gross),
    count,
    avgPerDay: dates.length ? fromCentavos(Math.round(gross / dates.length)) : 0,
    cash: fromCentavos(cash),
    utang: fromCentavos(gross - cash),
  }
}

export interface TopItem {
  rank: number
  item_key: string
  name: string
  qty: number
  amount: number
}

/** Grouped by item_key; the display name is the most recently typed item_name. */
export function topItems(
  sales: readonly AnalyticsSale[],
  by: 'qty' | 'amount',
  limit = 10,
): TopItem[] {
  const groups = new Map<string, { name: string; at: number; qty: number; centavos: number }>()
  for (const s of active(sales)) {
    const at = s.recorded_at.getTime()
    const g = groups.get(s.item_key)
    if (!g) {
      groups.set(s.item_key, { name: s.item_name, at, qty: s.qty, centavos: toCentavos(s.subtotal) })
      continue
    }
    g.qty = roundQty(g.qty + s.qty)
    g.centavos += toCentavos(s.subtotal)
    if (at >= g.at) {
      g.at = at
      g.name = s.item_name
    }
  }
  const rows = [...groups].map(([item_key, g]) => ({ item_key, name: g.name, qty: g.qty, centavos: g.centavos }))
  rows.sort((a, b) => {
    const primary = by === 'qty' ? b.qty - a.qty : b.centavos - a.centavos
    if (primary) return primary
    const secondary = by === 'qty' ? b.centavos - a.centavos : b.qty - a.qty
    return secondary || a.name.localeCompare(b.name)
  })
  return rows.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    item_key: r.item_key,
    name: r.name,
    qty: r.qty,
    amount: fromCentavos(r.centavos),
  }))
}

export interface HourBucket {
  hour: number
  label: string
  amount: number
}

export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'AM' : 'PM'}`
}

/**
 * Total amount per Asia/Manila clock hour of recorded_at. Shows 6AM–10PM, widened to include
 * any hour that has sales; hours in between are zero-filled.
 */
export function salesByHour(sales: readonly AnalyticsSale[]): HourBucket[] {
  const centavos = new Array<number>(24).fill(0)
  const hasSales = new Array<boolean>(24).fill(false)
  for (const s of active(sales)) {
    const hour = Number(formatInTimeZone(s.recorded_at, TIMEZONE, 'H'))
    centavos[hour] += toCentavos(s.subtotal)
    hasSales[hour] = true
  }
  let first = DEFAULT_FIRST_HOUR
  let last = DEFAULT_LAST_HOUR
  hasSales.forEach((has, hour) => {
    if (!has) return
    first = Math.min(first, hour)
    last = Math.max(last, hour)
  })
  const buckets: HourBucket[] = []
  for (let hour = first; hour <= last; hour++) {
    buckets.push({ hour, label: formatHour(hour), amount: fromCentavos(centavos[hour]) })
  }
  return buckets
}

export interface WeekdayAverage {
  weekday: number
  name: string
  /** How many times this weekday appears in the range. */
  occurrences: number
  average: number
}

/** Per weekday (of the business date): total ÷ number of times that weekday occurs in the range. */
export function weekdayAverages(
  sales: readonly AnalyticsSale[],
  dates: readonly string[],
): WeekdayAverage[] {
  const inRange = new Set(dates)
  const occurrences = new Array<number>(7).fill(0)
  for (const d of dates) occurrences[weekdayOf(d)]++
  const centavos = new Array<number>(7).fill(0)
  for (const s of active(sales)) {
    if (inRange.has(s.business_date)) centavos[weekdayOf(s.business_date)] += toCentavos(s.subtotal)
  }
  return DAY_NAMES.map((name, weekday) => ({
    weekday,
    name,
    occurrences: occurrences[weekday],
    average: occurrences[weekday] ? fromCentavos(Math.round(centavos[weekday] / occurrences[weekday])) : 0,
  }))
}

export interface DailyPoint {
  date: string
  dayOfMonth: number
  amount: number
}

/** Gross per business date across the range, zero-filled. */
export function dailyTrend(sales: readonly AnalyticsSale[], dates: readonly string[]): DailyPoint[] {
  const centavos = new Map<string, number>()
  for (const s of active(sales)) {
    centavos.set(s.business_date, (centavos.get(s.business_date) ?? 0) + toCentavos(s.subtotal))
  }
  return dates.map((date) => ({
    date,
    dayOfMonth: Number(date.slice(8, 10)),
    amount: fromCentavos(centavos.get(date) ?? 0),
  }))
}

export interface BantayStats {
  uid: string
  name: string
  gross: number
  count: number
  cash: number
  utang: number
}

/** Every member (plus any unknown recorder), sorted by gross, highest first. */
export function perBantay(
  sales: readonly AnalyticsSale[],
  members: readonly { id: string; name: string }[],
): BantayStats[] {
  const stats = new Map<string, { gross: number; cash: number; count: number }>()
  for (const m of members) stats.set(m.id, { gross: 0, cash: 0, count: 0 })
  for (const s of active(sales)) {
    let st = stats.get(s.recorded_by)
    if (!st) {
      st = { gross: 0, cash: 0, count: 0 }
      stats.set(s.recorded_by, st)
    }
    const c = toCentavos(s.subtotal)
    st.gross += c
    st.count++
    if (s.payment_type === 'cash') st.cash += c
  }
  const names = new Map(members.map((m) => [m.id, m.name]))
  return [...stats]
    .map(([uid, st]) => ({
      uid,
      name: names.get(uid) ?? '?',
      gross: fromCentavos(st.gross),
      count: st.count,
      cash: fromCentavos(st.cash),
      utang: fromCentavos(st.gross - st.cash),
    }))
    .sort((a, b) => b.gross - a.gross || a.name.localeCompare(b.name))
}
