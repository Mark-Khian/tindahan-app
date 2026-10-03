import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'bantay'
export type PaymentType = 'cash' | 'utang'

export interface Member {
  id: string
  name: string
  role: Role
  last_sync_at: Timestamp | null
}

export interface VoidFields {
  voided: boolean
  void_reason: string | null
  voided_by: string | null
  voided_at: Timestamp | null
}

export interface Sale extends VoidFields {
  id: string
  item_name: string
  item_key: string
  qty: number
  unit_price: number
  subtotal: number
  payment_type: PaymentType
  customer_id: string | null
  batch_id: string | null
  recorded_by: string
  recorded_at: Timestamp
  server_created_at: Timestamp | null
  business_date: string
  is_late_entry: boolean
  /** Local-only: snapshot metadata says this doc has not reached the server yet. */
  pending: boolean
}

export interface Payment extends VoidFields {
  id: string
  customer_id: string
  amount: number
  received_by: string
  received_at: Timestamp
  server_created_at: Timestamp | null
  business_date: string
  is_late_entry: boolean
  pending: boolean
}

export interface Customer {
  id: string
  name: string
  name_key: string
  created_by: string
  created_at: Timestamp
  pending: boolean
}

export interface Shift {
  id: string
  uid: string
  started_at: Timestamp
  /** Null while this member is on duty. Set when they tap Off Duty. */
  ended_at: Timestamp | null
  business_date: string
}

export interface MemberTotals {
  name: string
  gross: number
  cash_sales: number
  utang_sales: number
  payments: number
}

export interface DayTotals {
  gross: number
  cash_sales: number
  utang_sales: number
  utang_payments: number
  expected_cash: number
  per_member: Record<string, MemberTotals>
}

export interface DayClosure {
  id: string
  closed_by: string
  closed_at: Timestamp | null
  totals: DayTotals
  pending: boolean
}

export type AuditAction = 'void' | 'late_entry' | 'close_day' | 'delete_close_day'
