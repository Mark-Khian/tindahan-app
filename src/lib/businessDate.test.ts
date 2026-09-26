import { describe, expect, it } from 'vitest'
import { addDays, formatBusinessDate, formatDateTime, getBusinessDate } from './businessDate'

// Manila is UTC+8 with no DST.
const manila = (iso: string) => new Date(`${iso}+08:00`)

describe('getBusinessDate', () => {
  it('uses the same calendar day during store hours', () => {
    expect(getBusinessDate(manila('2026-09-26T06:00:00'))).toBe('2026-09-26')
    expect(getBusinessDate(manila('2026-09-26T12:30:00'))).toBe('2026-09-26')
    expect(getBusinessDate(manila('2026-09-26T22:00:00'))).toBe('2026-09-26')
  })

  it('keeps entries after midnight on the previous business date until 03:59', () => {
    expect(getBusinessDate(manila('2026-09-27T00:00:00'))).toBe('2026-09-26')
    expect(getBusinessDate(manila('2026-09-27T02:15:00'))).toBe('2026-09-26')
    expect(getBusinessDate(manila('2026-09-27T03:59:59.999'))).toBe('2026-09-26')
  })

  it('starts a new business date at exactly 04:00 Manila time', () => {
    expect(getBusinessDate(manila('2026-09-27T04:00:00'))).toBe('2026-09-27')
  })

  it('is independent of the device timezone (works from UTC instants)', () => {
    // 2026-09-26T19:59Z = 2026-09-27 03:59 Manila
    expect(getBusinessDate(new Date('2026-09-26T19:59:00Z'))).toBe('2026-09-26')
    // 2026-09-26T20:00Z = 2026-09-27 04:00 Manila
    expect(getBusinessDate(new Date('2026-09-26T20:00:00Z'))).toBe('2026-09-27')
  })

  it('handles month and year boundaries', () => {
    expect(getBusinessDate(manila('2027-01-01T01:00:00'))).toBe('2026-12-31')
    expect(getBusinessDate(manila('2026-03-01T03:00:00'))).toBe('2026-02-28')
    expect(getBusinessDate(manila('2028-03-01T03:00:00'))).toBe('2028-02-29')
  })
})

describe('addDays', () => {
  it('adds and subtracts days across boundaries', () => {
    expect(addDays('2026-09-26', 1)).toBe('2026-09-27')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-09-26', -60)).toBe('2026-07-28')
  })
})

describe('formatBusinessDate', () => {
  it('uses the full Filipino day name and abbreviated month', () => {
    expect(formatBusinessDate('2026-09-26')).toBe('Sabado, Set 26, 2026')
  })

  it('names all 7 days in full', () => {
    expect(formatBusinessDate('2026-09-20')).toBe('Linggo, Set 20, 2026')
    expect(formatBusinessDate('2026-09-21')).toBe('Lunes, Set 21, 2026')
    expect(formatBusinessDate('2026-09-22')).toBe('Martes, Set 22, 2026')
    expect(formatBusinessDate('2026-09-23')).toBe('Miyerkules, Set 23, 2026')
    expect(formatBusinessDate('2026-09-24')).toBe('Huwebes, Set 24, 2026')
    expect(formatBusinessDate('2026-09-25')).toBe('Biyernes, Set 25, 2026')
    expect(formatBusinessDate('2026-09-26')).toBe('Sabado, Set 26, 2026')
  })

  it('handles month and year boundaries', () => {
    expect(formatBusinessDate('2027-01-01')).toBe('Biyernes, Ene 1, 2027')
    expect(formatBusinessDate('2028-02-29')).toBe('Martes, Peb 29, 2028')
  })
})

describe('formatDateTime', () => {
  it('shows the Manila calendar date with full day name and time', () => {
    expect(formatDateTime(manila('2026-09-26T22:02:00'))).toBe('Sabado, Set 26, 2026, 10:02 PM')
  })

  it('uses the calendar date, not the business date, after midnight', () => {
    expect(formatDateTime(manila('2026-09-27T01:30:00'))).toBe('Linggo, Set 27, 2026, 1:30 AM')
  })

  it('is independent of the device timezone', () => {
    // 2026-09-26T16:00Z = 2026-09-27 00:00 Manila
    expect(formatDateTime(new Date('2026-09-26T16:00:00Z'))).toBe('Linggo, Set 27, 2026, 12:00 AM')
  })
})
