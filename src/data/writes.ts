import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBusinessDate } from '@/lib/businessDate'
import { computeSubtotal } from '@/lib/money'
import { normalizeKey } from '@/lib/normalize'
import type { AuditAction, DayTotals, Payment, PaymentType, Sale } from '@/lib/types'
import { commitTracked } from './syncStore'

// No transactions anywhere: they fail offline. Only plain and batched writes.

export interface EntryTarget {
  business_date: string
  is_late_entry: boolean
}

export interface ItemInput {
  item_name: string
  qty: number
  unit_price: number
}

const salesCol = collection(db, 'sales')
const paymentsCol = collection(db, 'payments')
const customersCol = collection(db, 'customers')
const shiftsCol = collection(db, 'shifts')
const auditCol = collection(db, 'audit_log')

type AuditTarget = 'sales' | 'payments' | 'day_closures' | 'customers'

function addAudit(
  batch: WriteBatch,
  entry: {
    action: AuditAction
    target_collection: AuditTarget
    target_id: string
    by: string
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
    reason: string | null
  },
) {
  batch.set(doc(auditCol), { ...entry, at: serverTimestamp() })
}

function buildSale(
  item: ItemInput,
  opts: {
    uid: string
    target: EntryTarget
    payment_type: PaymentType
    customer_id: string | null
    batch_id: string | null
    now: Date
  },
) {
  return {
    item_name: item.item_name.trim(),
    item_key: normalizeKey(item.item_name),
    qty: item.qty,
    unit_price: item.unit_price,
    subtotal: computeSubtotal(item.qty, item.unit_price),
    payment_type: opts.payment_type,
    customer_id: opts.customer_id,
    batch_id: opts.batch_id,
    recorded_by: opts.uid,
    recorded_at: Timestamp.fromDate(opts.now),
    server_created_at: serverTimestamp(),
    business_date: opts.target.business_date,
    is_late_entry: opts.target.is_late_entry,
    voided: false,
    void_reason: null,
    voided_by: null,
    voided_at: null,
  }
}

function saleSummary(s: Pick<Sale, 'item_name' | 'qty' | 'unit_price' | 'subtotal' | 'payment_type' | 'customer_id' | 'business_date'>) {
  return {
    item_name: s.item_name,
    qty: s.qty,
    unit_price: s.unit_price,
    subtotal: s.subtotal,
    payment_type: s.payment_type,
    customer_id: s.customer_id,
    business_date: s.business_date,
  }
}

function paymentSummary(p: Pick<Payment, 'customer_id' | 'amount' | 'business_date'>) {
  return { customer_id: p.customer_id, amount: p.amount, business_date: p.business_date }
}

export function recordCashSale(item: ItemInput, uid: string, target: EntryTarget) {
  const batch = writeBatch(db)
  const ref = doc(salesCol)
  const data = buildSale(item, {
    uid,
    target,
    payment_type: 'cash',
    customer_id: null,
    batch_id: null,
    now: new Date(),
  })
  batch.set(ref, data)
  if (target.is_late_entry) {
    addAudit(batch, {
      action: 'late_entry',
      target_collection: 'sales',
      target_id: ref.id,
      by: uid,
      before: null,
      after: saleSummary(data),
      reason: null,
    })
  }
  commitTracked(batch, `Benta: ${data.item_name}`)
}

function setNewCustomer(batch: WriteBatch, name: string, uid: string): string {
  const ref = doc(customersCol)
  batch.set(ref, {
    name: name.trim(),
    name_key: normalizeKey(name),
    created_by: uid,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export type CustomerChoice = { id: string; unarchive?: boolean } | { newName: string }

/** Saves all items as utang sales sharing one batch_id. Returns the customer id. */
export function recordUtang(
  customer: CustomerChoice,
  items: ItemInput[],
  uid: string,
  target: EntryTarget,
): string {
  const batch = writeBatch(db)
  const customerId = 'id' in customer ? customer.id : setNewCustomer(batch, customer.newName, uid)
  if ('id' in customer && customer.unarchive) {
    batch.update(doc(db, 'customers', customerId), { archived: false })
  }
  const batchId = doc(salesCol).id
  const now = new Date()
  for (const item of items) {
    const ref = doc(salesCol)
    const data = buildSale(item, {
      uid,
      target,
      payment_type: 'utang',
      customer_id: customerId,
      batch_id: batchId,
      now,
    })
    batch.set(ref, data)
    if (target.is_late_entry) {
      addAudit(batch, {
        action: 'late_entry',
        target_collection: 'sales',
        target_id: ref.id,
        by: uid,
        before: null,
        after: saleSummary(data),
        reason: null,
      })
    }
  }
  commitTracked(batch, `Utang (${items.length} item)`)
  return customerId
}

/** Hides a paid-up customer. Sales and payments stay. */
export function archiveCustomer(customerId: string, uid: string) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'customers', customerId), {
    archived: true,
    archived_by: uid,
    archived_at: serverTimestamp(),
  })
  addAudit(batch, {
    action: 'archive_customer',
    target_collection: 'customers',
    target_id: customerId,
    by: uid,
    before: { archived: false },
    after: { archived: true },
    reason: null,
  })
  commitTracked(batch, 'Archive customer')
}

export function recordPayment(customerId: string, amount: number, uid: string, target: EntryTarget) {
  const batch = writeBatch(db)
  const ref = doc(paymentsCol)
  const data = {
    customer_id: customerId,
    amount,
    received_by: uid,
    received_at: Timestamp.fromDate(new Date()),
    server_created_at: serverTimestamp(),
    business_date: target.business_date,
    is_late_entry: target.is_late_entry,
    voided: false,
    void_reason: null,
    voided_by: null,
    voided_at: null,
  }
  batch.set(ref, data)
  if (target.is_late_entry) {
    addAudit(batch, {
      action: 'late_entry',
      target_collection: 'payments',
      target_id: ref.id,
      by: uid,
      before: null,
      after: paymentSummary(data),
      reason: null,
    })
  }
  commitTracked(batch, 'Bayad')
}

export type VoidTarget = { kind: 'sales'; entry: Sale } | { kind: 'payments'; entry: Payment }

export function voidEntry(target: VoidTarget, reason: string, uid: string) {
  const batch = writeBatch(db)
  const ref = doc(db, target.kind, target.entry.id)
  batch.update(ref, {
    voided: true,
    void_reason: reason.trim(),
    voided_by: uid,
    voided_at: serverTimestamp(),
  })
  const summary =
    target.kind === 'sales' ? saleSummary(target.entry) : paymentSummary(target.entry)
  addAudit(batch, {
    action: 'void',
    target_collection: target.kind,
    target_id: target.entry.id,
    by: uid,
    before: { ...summary, voided: false },
    after: { ...summary, voided: true, void_reason: reason.trim() },
    reason: reason.trim(),
  })
  commitTracked(batch, 'Void')
}

export function startShift(uid: string) {
  const batch = writeBatch(db)
  const now = new Date()
  batch.set(doc(shiftsCol), {
    uid,
    started_at: Timestamp.fromDate(now),
    ended_at: null,
    business_date: getBusinessDate(now),
  })
  commitTracked(batch, 'Simula ng bantay')
}

/** Closes the member's open shift documents. Completed shifts stay stored. */
export function endShift(shiftIds: readonly string[]) {
  if (shiftIds.length === 0) return
  const batch = writeBatch(db)
  const ended_at = Timestamp.fromDate(new Date())
  for (const id of shiftIds) {
    batch.update(doc(db, 'shifts', id), { ended_at })
  }
  commitTracked(batch, 'Tapos na ang duty')
}

export function closeDay(businessDate: string, totals: DayTotals, uid: string) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'day_closures', businessDate), {
    closed_by: uid,
    closed_at: serverTimestamp(),
    totals,
  })
  addAudit(batch, {
    action: 'close_day',
    target_collection: 'day_closures',
    target_id: businessDate,
    by: uid,
    before: null,
    after: { ...totals },
    reason: null,
  })
  commitTracked(batch, `Close Day ${businessDate}`)
}

/** Removes the close-day lock and snapshot. Sales and payments stay. Admin only at the rules. */
export function deleteCloseDay(businessDate: string, totals: DayTotals, uid: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'day_closures', businessDate))
  addAudit(batch, {
    action: 'delete_close_day',
    target_collection: 'day_closures',
    target_id: businessDate,
    by: uid,
    before: { ...totals },
    after: null,
    reason: null,
  })
  commitTracked(batch, `Delete Close Day ${businessDate}`)
}

/** Not tracked as a pending write: it is bookkeeping, not store data. */
export function touchLastSync(uid: string) {
  return updateDoc(doc(db, 'members', uid), { last_sync_at: serverTimestamp() })
}
