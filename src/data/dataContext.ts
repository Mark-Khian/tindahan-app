import { createContext, useContext } from 'react'
import type { Customer, DayClosure, Member, Payment, Sale, Shift } from '@/lib/types'

export interface DataValue {
  /** Current business date (4AM Asia/Manila cut-off), refreshed periodically. */
  today: string
  members: Member[]
  memberNames: Record<string, string>
  customers: Customer[]
  customersById: Map<string, Customer>
  /** All utang sales ever (needed to compute balances). */
  utangSales: Sale[]
  /** All payments ever (needed to compute balances). */
  payments: Payment[]
  todaySales: Sale[]
  /** Latest shift for today, i.e. who is on duty. */
  onDuty: Shift | null
  closures: DayClosure[]
  closuresById: Map<string, DayClosure>
  balances: Map<string, number>
  ready: boolean
}

export const DataContext = createContext<DataValue | null>(null)

export function useData(): DataValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used inside <DataProvider>')
  return value
}
