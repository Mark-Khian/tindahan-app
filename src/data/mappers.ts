import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import type { Customer, DayClosure, Member, Payment, Sale, Shift } from '@/lib/types'

type Snap = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>

// 'estimate' so locally-written serverTimestamp() fields read as the local time instead of null.
const read = (d: Snap) => d.data({ serverTimestamps: 'estimate' }) ?? {}

export const toMember = (d: Snap): Member => {
  const data = read(d)
  return {
    id: d.id,
    name: data.name ?? '(walang pangalan)',
    role: data.role === 'admin' ? 'admin' : 'bantay',
    last_sync_at: data.last_sync_at ?? null,
  }
}

export const toSale = (d: Snap): Sale =>
  ({ ...read(d), id: d.id, pending: d.metadata.hasPendingWrites }) as Sale

export const toPayment = (d: Snap): Payment =>
  ({ ...read(d), id: d.id, pending: d.metadata.hasPendingWrites }) as Payment

export const toCustomer = (d: Snap): Customer =>
  ({ ...read(d), id: d.id, pending: d.metadata.hasPendingWrites }) as Customer

export const toShift = (d: Snap): Shift => ({ ...read(d), id: d.id }) as Shift

export const toClosure = (d: Snap): DayClosure =>
  ({ ...read(d), id: d.id, pending: d.metadata.hasPendingWrites }) as DayClosure
