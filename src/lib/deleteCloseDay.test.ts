import { describe, expect, it } from 'vitest'
import { buildDeleteCloseDay, deleteClosingMenuVisible } from './deleteCloseDay'
import type { DayTotals } from './types'

const totals: DayTotals = {
  gross: 100,
  cash_sales: 80,
  utang_sales: 20,
  utang_payments: 10,
  expected_cash: 90,
  per_member: {
    mama: { name: 'Mama', gross: 100, cash_sales: 80, utang_sales: 20, payments: 10 },
  },
}

const closure = {
  id: '2026-10-02',
  closed_by: 'mama',
  closed_at: { seconds: 1_700_000_000 },
  totals,
  pending: true,
}

describe('delete a past closing', () => {
  it('deletes that closing and writes the audit entry with the full before copy', () => {
    const plan = buildDeleteCloseDay(closure, 'admin')
    expect(plan.closureId).toBe('2026-10-02')
    expect(plan.audit).toEqual({
      action: 'delete_close_day',
      target_collection: 'day_closures',
      target_id: '2026-10-02',
      by: 'admin',
      before: {
        closed_by: 'mama',
        closed_at: closure.closed_at,
        totals,
      },
      after: null,
      reason: null,
    })
    expect(plan.audit.before).not.toHaveProperty('id')
    expect(plan.audit.before).not.toHaveProperty('pending')
  })

  it('shows the ⋯ option only for an admin', () => {
    expect(deleteClosingMenuVisible('admin')).toBe(true)
    expect(deleteClosingMenuVisible('bantay')).toBe(false)
  })
})
