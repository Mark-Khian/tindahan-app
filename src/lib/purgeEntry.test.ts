import { describe, expect, it } from 'vitest'
import { buildPurgeEntry, purgeMenuVisible, PURGE_REASON } from './purgeEntry'

const sale = {
  id: 's1',
  pending: true,
  item_name: 'Coke',
  qty: 2,
  unit_price: 20,
  subtotal: 40,
  payment_type: 'cash' as const,
  customer_id: null,
  voided: true,
  void_reason: 'training',
  voided_by: 'ana',
}

const payment = {
  id: 'p1',
  pending: false,
  customer_id: 'c1',
  amount: 50,
  voided: true,
  void_reason: 'demo',
  voided_by: 'admin',
}

describe('purge entry batch', () => {
  it('creates the audit doc with the full before copy and deletes the sale', () => {
    const plan = buildPurgeEntry('sales', sale, 'admin')
    expect(plan.auditId).toBe('purge_s1')
    expect(plan.collection).toBe('sales')
    expect(plan.entryId).toBe('s1')
    expect(plan.audit).toEqual({
      action: 'purge_entry',
      target_collection: 'sales',
      target_id: 's1',
      by: 'admin',
      before: {
        item_name: 'Coke',
        qty: 2,
        unit_price: 20,
        subtotal: 40,
        payment_type: 'cash',
        customer_id: null,
        voided: true,
        void_reason: 'training',
        voided_by: 'ana',
      },
      after: null,
      reason: PURGE_REASON,
    })
    expect(plan.audit.before).not.toHaveProperty('id')
    expect(plan.audit.before).not.toHaveProperty('pending')
  })

  it('deletes the payment and keeps its full before copy', () => {
    const plan = buildPurgeEntry('payments', payment, 'admin')
    expect(plan.auditId).toBe('purge_p1')
    expect(plan.collection).toBe('payments')
    expect(plan.entryId).toBe('p1')
    expect(plan.audit.before).toEqual({
      customer_id: 'c1',
      amount: 50,
      voided: true,
      void_reason: 'demo',
      voided_by: 'admin',
    })
    expect(plan.audit.reason).toBe('Permanent delete of a voided entry')
  })

  it('shows the ⋯ option only for an admin', () => {
    expect(purgeMenuVisible('admin')).toBe(true)
    expect(purgeMenuVisible('bantay')).toBe(false)
  })
})
