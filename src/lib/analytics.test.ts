import { describe, expect, it } from 'vitest'
import {
  dailyTrend,
  formatHour,
  getRangeDates,
  perBantay,
  salesByHour,
  summarize,
  topItems,
  weekdayAverages,
  type AnalyticsSale,
} from './analytics'
import { getBusinessDate } from './businessDate'

// Manila is UTC+8 with no DST.
const manila = (iso: string) => new Date(`${iso}+08:00`)

function sale(overrides: Partial<AnalyticsSale> & { at?: string } = {}): AnalyticsSale {
  const { at = '2026-09-26T10:00:00', ...rest } = overrides
  const recorded_at = manila(at)
  return {
    item_key: 'coke',
    item_name: 'Coke',
    qty: 1,
    subtotal: 20,
    payment_type: 'cash',
    recorded_by: 'a',
    recorded_at,
    business_date: getBusinessDate(recorded_at),
    voided: false,
    ...rest,
  }
}

describe('getRangeDates', () => {
  it('returns the last 7 business dates including today', () => {
    expect(getRangeDates('2026-09-26', '7d')).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
    ])
  })

  it('returns 30 dates across a month boundary', () => {
    const dates = getRangeDates('2026-10-05', '30d')
    expect(dates).toHaveLength(30)
    expect(dates[0]).toBe('2026-09-06')
    expect(dates.at(-1)).toBe('2026-10-05')
  })

  it('covers the 1st of the month through today', () => {
    const dates = getRangeDates('2026-09-26', 'month')
    expect(dates).toHaveLength(26)
    expect(dates[0]).toBe('2026-09-01')
    expect(dates.at(-1)).toBe('2026-09-26')
  })

  it('is just today on the 1st of the month', () => {
    expect(getRangeDates('2026-10-01', 'month')).toEqual(['2026-10-01'])
  })

  it('follows the 4AM business-date cut-off', () => {
    const at0359 = getBusinessDate(manila('2026-10-01T03:59:00'))
    const at0400 = getBusinessDate(manila('2026-10-01T04:00:00'))
    expect(getRangeDates(at0359, 'month')).toHaveLength(30)
    expect(getRangeDates(at0359, 'month').at(-1)).toBe('2026-09-30')
    expect(getRangeDates(at0400, 'month')).toEqual(['2026-10-01'])
    expect(getRangeDates(at0359, '7d').at(-1)).toBe('2026-09-30')
  })
})

describe('summarize', () => {
  const dates = getRangeDates('2026-09-26', '7d')

  it('computes gross, count, cash / utang split, and includes utang sales', () => {
    const s = summarize(
      [sale({ subtotal: 100 }), sale({ subtotal: 50, payment_type: 'utang' }), sale({ subtotal: 25.5 })],
      dates,
    )
    expect(s).toEqual({ gross: 175.5, count: 3, avgPerDay: 25.07, cash: 125.5, utang: 50 })
  })

  it('excludes voided entries', () => {
    const s = summarize([sale({ subtotal: 100 }), sale({ subtotal: 999, voided: true })], dates)
    expect(s.gross).toBe(100)
    expect(s.count).toBe(1)
  })

  it('divides by every date in the range, including days with no sales', () => {
    expect(summarize([sale({ subtotal: 70 })], dates).avgPerDay).toBe(10)
  })

  it('keeps centavo precision', () => {
    const many = Array.from({ length: 10 }, () => sale({ subtotal: 0.1 }))
    const s = summarize([...many, sale({ subtotal: 0.2, payment_type: 'utang' })], dates)
    expect(s.gross).toBe(1.2)
    expect(s.cash).toBe(1)
    expect(s.utang).toBe(0.2)
  })

  it('returns zeros for no sales', () => {
    expect(summarize([], dates)).toEqual({ gross: 0, count: 0, avgPerDay: 0, cash: 0, utang: 0 })
  })
})

describe('topItems', () => {
  it('groups by item_key and uses the most recent item_name', () => {
    const top = topItems(
      [
        sale({ item_key: 'coke', item_name: 'coke', at: '2026-09-25T09:00:00' }),
        sale({ item_key: 'coke', item_name: 'Coke Mismo', at: '2026-09-26T09:00:00' }),
        sale({ item_key: 'coke', item_name: 'COKE', at: '2026-09-24T09:00:00' }),
      ],
      'qty',
    )
    expect(top).toEqual([{ rank: 1, item_key: 'coke', name: 'Coke Mismo', qty: 3, amount: 60 }])
  })

  it('ranks by qty or by amount', () => {
    const sales = [
      sale({ item_key: 'candy', item_name: 'Candy', qty: 10, subtotal: 10 }),
      sale({ item_key: 'rice', item_name: 'Bigas', qty: 2, subtotal: 100 }),
    ]
    expect(topItems(sales, 'qty').map((t) => t.name)).toEqual(['Candy', 'Bigas'])
    expect(topItems(sales, 'amount').map((t) => t.name)).toEqual(['Bigas', 'Candy'])
  })

  it('excludes voided entries and includes utang sales', () => {
    const top = topItems(
      [
        sale({ item_key: 'x', item_name: 'X', qty: 50, voided: true }),
        sale({ item_key: 'y', item_name: 'Y', qty: 2, payment_type: 'utang' }),
      ],
      'qty',
    )
    expect(top.map((t) => t.item_key)).toEqual(['y'])
  })

  it('ignores the name of a voided later entry', () => {
    const top = topItems(
      [
        sale({ item_name: 'Coke', at: '2026-09-25T09:00:00' }),
        sale({ item_name: 'Typo', at: '2026-09-26T09:00:00', voided: true }),
      ],
      'qty',
    )
    expect(top[0].name).toBe('Coke')
  })

  it('limits to 10 and numbers the ranks', () => {
    const sales = Array.from({ length: 12 }, (_, i) =>
      sale({ item_key: `k${i}`, item_name: `Item ${i}`, qty: i + 1, subtotal: i + 1 }),
    )
    const top = topItems(sales, 'qty')
    expect(top).toHaveLength(10)
    expect(top[0]).toMatchObject({ rank: 1, name: 'Item 11' })
    expect(top[9]).toMatchObject({ rank: 10, name: 'Item 2' })
  })

  it('keeps centavo and quantity precision', () => {
    const top = topItems(
      [sale({ qty: 0.1, subtotal: 0.1 }), sale({ qty: 0.2, subtotal: 0.2 })],
      'amount',
    )
    expect(top[0].amount).toBe(0.3)
    expect(top[0].qty).toBe(0.3)
  })

  it('breaks ties by the other metric, then by name', () => {
    const top = topItems(
      [
        sale({ item_key: 'b', item_name: 'B', qty: 1, subtotal: 10 }),
        sale({ item_key: 'a', item_name: 'A', qty: 1, subtotal: 10 }),
        sale({ item_key: 'c', item_name: 'C', qty: 1, subtotal: 30 }),
      ],
      'qty',
    )
    expect(top.map((t) => t.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('formatHour', () => {
  it('uses 12-hour labels', () => {
    expect(formatHour(0)).toBe('12AM')
    expect(formatHour(6)).toBe('6AM')
    expect(formatHour(12)).toBe('12PM')
    expect(formatHour(22)).toBe('10PM')
  })
})

describe('salesByHour', () => {
  it('shows 6AM–10PM by default, zero-filled', () => {
    const hours = salesByHour([])
    expect(hours).toHaveLength(17)
    expect(hours[0]).toEqual({ hour: 6, label: '6AM', amount: 0 })
    expect(hours.at(-1)).toEqual({ hour: 22, label: '10PM', amount: 0 })
  })

  it('buckets by Asia/Manila hour regardless of the device timezone', () => {
    // 2026-09-26T01:30Z = 09:30 Manila
    const hours = salesByHour([
      { ...sale({ subtotal: 15 }), recorded_at: new Date('2026-09-26T01:30:00Z') },
      sale({ at: '2026-09-26T09:59:59', subtotal: 5 }),
      sale({ at: '2026-09-26T10:00:00', subtotal: 7 }),
    ])
    expect(hours.find((h) => h.hour === 9)?.amount).toBe(20)
    expect(hours.find((h) => h.hour === 10)?.amount).toBe(7)
  })

  it('widens the window to include sales outside 6AM–10PM', () => {
    const hours = salesByHour([
      sale({ at: '2026-09-27T02:15:00', subtotal: 10 }),
      sale({ at: '2026-09-26T23:30:00', subtotal: 4 }),
    ])
    expect(hours[0]).toEqual({ hour: 2, label: '2AM', amount: 10 })
    expect(hours.at(-1)).toEqual({ hour: 23, label: '11PM', amount: 4 })
    expect(hours.find((h) => h.hour === 3)?.amount).toBe(0)
  })

  it('excludes voided entries, includes utang, and keeps centavo precision', () => {
    const hours = salesByHour([
      sale({ subtotal: 0.1 }),
      sale({ subtotal: 0.2, payment_type: 'utang' }),
      sale({ subtotal: 100, voided: true }),
    ])
    expect(hours.find((h) => h.hour === 10)?.amount).toBe(0.3)
  })
})

describe('weekdayAverages', () => {
  const dates = getRangeDates('2026-09-26', '7d')
  // 2026-09-14 (Monday) .. 2026-09-26 (Saturday): 13 dates, Monday–Saturday occur twice, Sunday once.
  const twoWeeks = [...getRangeDates('2026-09-19', '7d').slice(1), ...getRangeDates('2026-09-26', '7d')]

  it('uses full English day names starting with Sunday', () => {
    expect(weekdayAverages([], dates).map((d) => d.name)).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ])
  })

  it('averages per occurrence of each weekday in the range', () => {
    expect(twoWeeks).toHaveLength(13)
    const result = weekdayAverages(
      [
        sale({ at: '2026-09-14T10:00:00', subtotal: 100 }), // Monday
        sale({ at: '2026-09-21T10:00:00', subtotal: 50 }), // Monday
        sale({ at: '2026-09-20T10:00:00', subtotal: 30 }), // Sunday
      ],
      twoWeeks,
    )
    expect(result[1]).toEqual({ weekday: 1, name: 'Monday', occurrences: 2, average: 75 })
    expect(result[0]).toEqual({ weekday: 0, name: 'Sunday', occurrences: 1, average: 30 })
    expect(result[2]).toMatchObject({ name: 'Tuesday', occurrences: 2, average: 0 })
  })

  it('uses the business date, so a 2AM sale counts for the previous day', () => {
    // Sunday 02:00 belongs to Saturday's business date.
    const result = weekdayAverages([sale({ at: '2026-09-27T02:00:00', subtotal: 40 })], getRangeDates('2026-09-26', '7d'))
    expect(result[6].average).toBe(40)
    expect(result[0].average).toBe(0)
  })

  it('reports 0 occurrences for weekdays not in the range', () => {
    const result = weekdayAverages([], ['2026-09-26'])
    expect(result[6].occurrences).toBe(1)
    expect(result[0]).toMatchObject({ occurrences: 0, average: 0 })
  })

  it('excludes voided entries, includes utang, and rounds to centavos', () => {
    const result = weekdayAverages(
      [
        sale({ at: '2026-09-14T10:00:00', subtotal: 0.01 }),
        sale({ at: '2026-09-21T10:00:00', subtotal: 0.02, payment_type: 'utang' }),
        sale({ at: '2026-09-21T11:00:00', subtotal: 500, voided: true }),
      ],
      twoWeeks,
    )
    expect(result[1].average).toBe(0.02)
  })
})

describe('dailyTrend', () => {
  const dates = getRangeDates('2026-09-26', '7d')

  it('zero-fills days without sales', () => {
    const trend = dailyTrend([sale({ at: '2026-09-22T10:00:00', subtotal: 12 })], dates)
    expect(trend).toHaveLength(7)
    expect(trend.map((p) => p.amount)).toEqual([0, 0, 12, 0, 0, 0, 0])
    expect(trend[0]).toEqual({ date: '2026-09-20', dayOfMonth: 20, amount: 0 })
  })

  it('assigns sales before 4AM to the previous business date', () => {
    const trend = dailyTrend(
      [sale({ at: '2026-09-26T03:59:00', subtotal: 5 }), sale({ at: '2026-09-26T04:00:00', subtotal: 7 })],
      dates,
    )
    expect(trend.find((p) => p.date === '2026-09-25')?.amount).toBe(5)
    expect(trend.find((p) => p.date === '2026-09-26')?.amount).toBe(7)
  })

  it('excludes voided entries, includes utang, and keeps centavo precision', () => {
    const trend = dailyTrend(
      [sale({ subtotal: 0.1 }), sale({ subtotal: 0.2, payment_type: 'utang' }), sale({ subtotal: 9, voided: true })],
      dates,
    )
    expect(trend.at(-1)?.amount).toBe(0.3)
  })
})

describe('perBantay', () => {
  const members = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Ben' },
    { id: 'c', name: 'Cora' },
  ]

  it('computes gross, count, cash and utang per member, sorted by gross', () => {
    const result = perBantay(
      [
        sale({ recorded_by: 'a', subtotal: 10 }),
        sale({ recorded_by: 'b', subtotal: 30 }),
        sale({ recorded_by: 'b', subtotal: 20, payment_type: 'utang' }),
      ],
      members,
    )
    expect(result).toEqual([
      { uid: 'b', name: 'Ben', gross: 50, count: 2, cash: 30, utang: 20 },
      { uid: 'a', name: 'Ana', gross: 10, count: 1, cash: 10, utang: 0 },
      { uid: 'c', name: 'Cora', gross: 0, count: 0, cash: 0, utang: 0 },
    ])
  })

  it('excludes voided entries', () => {
    const result = perBantay([sale({ recorded_by: 'a', subtotal: 10, voided: true })], members)
    expect(result.find((r) => r.uid === 'a')).toMatchObject({ gross: 0, count: 0 })
  })

  it('labels recorders that are not in members', () => {
    const result = perBantay([sale({ recorded_by: 'zzz', subtotal: 5 })], members)
    expect(result[0]).toMatchObject({ uid: 'zzz', name: '?', gross: 5 })
  })

  it('keeps centavo precision', () => {
    const result = perBantay(
      Array.from({ length: 3 }, () => sale({ recorded_by: 'a', subtotal: 0.1 })),
      members,
    )
    expect(result[0].gross).toBe(0.3)
  })
})
