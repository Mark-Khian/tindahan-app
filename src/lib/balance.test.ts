import { describe, expect, it } from 'vitest'
import {
  balanceFor,
  computeBalances,
  customersWithActiveEntries,
  validatePaymentAmount,
  type BalancePayment,
  type BalanceSale,
} from './balance'

const utang = (customer_id: string, subtotal: number, voided = false): BalanceSale => ({
  payment_type: 'utang',
  customer_id,
  subtotal,
  voided,
})
const cash = (subtotal: number): BalanceSale => ({
  payment_type: 'cash',
  customer_id: null,
  subtotal,
  voided: false,
})
const pay = (customer_id: string, amount: number, voided = false): BalancePayment => ({
  customer_id,
  amount,
  voided,
})

describe('computeBalances', () => {
  it('sums utang sales minus payments per customer', () => {
    const balances = computeBalances(
      [utang('juan', 50), utang('juan', 25.5), utang('maria', 10)],
      [pay('juan', 20)],
    )
    expect(balances.get('juan')).toBe(55.5)
    expect(balances.get('maria')).toBe(10)
  })

  it('ignores cash sales', () => {
    const balances = computeBalances([cash(100), utang('juan', 5)], [])
    expect(balances.get('juan')).toBe(5)
    expect(balances.size).toBe(1)
  })

  it('excludes voided sales and voided payments', () => {
    const balances = computeBalances(
      [utang('juan', 50), utang('juan', 30, true)],
      [pay('juan', 10), pay('juan', 40, true)],
    )
    expect(balances.get('juan')).toBe(40)
  })

  it('returns zero when fully paid', () => {
    const balances = computeBalances([utang('juan', 0.1), utang('juan', 0.2)], [pay('juan', 0.3)])
    expect(balances.get('juan')).toBe(0)
  })

  it('includes customers who only have payments', () => {
    expect(computeBalances([], [pay('ana', 5)]).get('ana')).toBe(-5)
  })
})

describe('customersWithActiveEntries', () => {
  it('hides a customer whose entries are all voided', () => {
    const active = customersWithActiveEntries([utang('juan', 50, true)], [pay('juan', 10, true)])
    expect(active.has('juan')).toBe(false)
  })

  it('shows a customer with an active utang sale only', () => {
    expect(customersWithActiveEntries([utang('juan', 50)], []).has('juan')).toBe(true)
  })

  it('shows a fully paid customer with active records (₱0 balance)', () => {
    const sales = [utang('juan', 50)]
    const payments = [pay('juan', 50)]
    expect(customersWithActiveEntries(sales, payments).has('juan')).toBe(true)
    expect(computeBalances(sales, payments).get('juan')).toBe(0)
  })

  it('shows a customer with only an active payment', () => {
    expect(customersWithActiveEntries([utang('juan', 5, true)], [pay('juan', 5)]).has('juan')).toBe(true)
  })

  it('hides a customer with no entries at all', () => {
    expect(customersWithActiveEntries([utang('maria', 5)], [pay('maria', 1)]).has('juan')).toBe(false)
    expect(customersWithActiveEntries([], []).size).toBe(0)
  })

  it('ignores cash sales', () => {
    expect(customersWithActiveEntries([cash(100)], []).size).toBe(0)
  })
})

describe('balanceFor', () => {
  it('returns 0 for unknown customers', () => {
    expect(balanceFor('nobody', [utang('juan', 5)], [])).toBe(0)
  })

  it('returns a single customer balance', () => {
    expect(balanceFor('juan', [utang('juan', 5), utang('maria', 7)], [pay('juan', 2)])).toBe(3)
  })
})

describe('validatePaymentAmount', () => {
  it('accepts partial and full payments', () => {
    expect(validatePaymentAmount(10, 55.5)).toBe('ok')
    expect(validatePaymentAmount(55.5, 55.5)).toBe('ok')
  })

  it('blocks zero, negative and NaN', () => {
    expect(validatePaymentAmount(0, 10)).toBe('not_positive')
    expect(validatePaymentAmount(-1, 10)).toBe('not_positive')
    expect(validatePaymentAmount(Number.NaN, 10)).toBe('not_positive')
  })

  it('blocks amounts greater than the balance', () => {
    expect(validatePaymentAmount(55.51, 55.5)).toBe('exceeds_balance')
  })

  it('compares in centavos', () => {
    expect(validatePaymentAmount(0.1 + 0.2, 0.3)).toBe('ok')
  })
})
