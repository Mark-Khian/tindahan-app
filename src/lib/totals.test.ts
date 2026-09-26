import { describe, expect, it } from 'vitest'
import { computeDayTotals, totalsDiffer, type TotalsPayment, type TotalsSale } from './totals'

const sale = (
  payment_type: 'cash' | 'utang',
  subtotal: number,
  recorded_by: string,
  voided = false,
): TotalsSale => ({ payment_type, subtotal, recorded_by, voided })
const payment = (amount: number, received_by: string, voided = false): TotalsPayment => ({
  amount,
  received_by,
  voided,
})

const names = { a: 'Ana', b: 'Ben' }

describe('computeDayTotals', () => {
  it('computes gross, cash, utang, payments and expected cash', () => {
    const t = computeDayTotals(
      [sale('cash', 100, 'a'), sale('cash', 20.5, 'b'), sale('utang', 30, 'a')],
      [payment(15, 'b')],
      names,
    )
    expect(t.gross).toBe(150.5)
    expect(t.cash_sales).toBe(120.5)
    expect(t.utang_sales).toBe(30)
    expect(t.utang_payments).toBe(15)
    expect(t.expected_cash).toBe(135.5)
  })

  it('breaks totals down per member', () => {
    const t = computeDayTotals(
      [sale('cash', 100, 'a'), sale('utang', 30, 'a'), sale('cash', 5, 'b')],
      [payment(15, 'b')],
      names,
    )
    expect(t.per_member.a).toEqual({ name: 'Ana', gross: 130, cash_sales: 100, utang_sales: 30, payments: 0 })
    expect(t.per_member.b).toEqual({ name: 'Ben', gross: 5, cash_sales: 5, utang_sales: 0, payments: 15 })
  })

  it('excludes voided entries', () => {
    const t = computeDayTotals(
      [sale('cash', 100, 'a'), sale('cash', 50, 'a', true)],
      [payment(10, 'a', true)],
      names,
    )
    expect(t.gross).toBe(100)
    expect(t.utang_payments).toBe(0)
    expect(t.expected_cash).toBe(100)
  })

  it('labels unknown members', () => {
    const t = computeDayTotals([sale('cash', 1, 'zzz')], [], names)
    expect(t.per_member.zzz.name).toBe('Unknown')
  })

  it('returns zeros for an empty day', () => {
    const t = computeDayTotals([], [], names)
    expect(t).toEqual({
      gross: 0,
      cash_sales: 0,
      utang_sales: 0,
      utang_payments: 0,
      expected_cash: 0,
      per_member: {},
    })
  })
})

describe('totalsDiffer', () => {
  it('detects changes in headline totals', () => {
    const a = computeDayTotals([sale('cash', 10, 'a')], [], names)
    const b = computeDayTotals([sale('cash', 10, 'a'), sale('cash', 1, 'a')], [], names)
    expect(totalsDiffer(a, a)).toBe(false)
    expect(totalsDiffer(a, b)).toBe(true)
  })

  it('detects an entry voided after the day was closed', () => {
    const closed = computeDayTotals([sale('cash', 10, 'a'), sale('cash', 5, 'a')], [payment(3, 'a')], names)
    const afterSaleVoid = computeDayTotals([sale('cash', 10, 'a'), sale('cash', 5, 'a', true)], [payment(3, 'a')], names)
    const afterPaymentVoid = computeDayTotals([sale('cash', 10, 'a'), sale('cash', 5, 'a')], [payment(3, 'a', true)], names)
    expect(totalsDiffer(closed, afterSaleVoid)).toBe(true)
    expect(afterSaleVoid.expected_cash).toBe(13)
    expect(totalsDiffer(closed, afterPaymentVoid)).toBe(true)
    expect(afterPaymentVoid.expected_cash).toBe(15)
  })
})
