import { useMemo, type ReactNode } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { computeBalances } from '@/lib/balance'
import { openDutyShifts } from '@/lib/duty'
import { getBusinessDate } from '@/lib/businessDate'
import { useNow } from '@/hooks/useNow'
import { DataContext, type DataValue } from './dataContext'
import { toClosure, toCustomer, toMember, toPayment, toSale, toShift } from './mappers'
import { useSalesForDate } from './queries'
import { useLiveQuery } from './useLiveQuery'

const membersQuery = collection(db, 'members')
const customersQuery = collection(db, 'customers')
const utangSalesQuery = query(collection(db, 'sales'), where('payment_type', '==', 'utang'))
const paymentsQuery = collection(db, 'payments')
const closuresQuery = collection(db, 'day_closures')

export function DataProvider({ children }: { children: ReactNode }) {
  const now = useNow()
  const today = getBusinessDate(now)

  // Members are not tracked: our own last_sync_at bookkeeping write should not show as "pending".
  const members = useLiveQuery(membersQuery, toMember, false)
  const customers = useLiveQuery(customersQuery, toCustomer)
  const utangSales = useLiveQuery(utangSalesQuery, toSale)
  const payments = useLiveQuery(paymentsQuery, toPayment)
  const closures = useLiveQuery(closuresQuery, toClosure)
  const todaySales = useSalesForDate(today)

  const shiftsQuery = useMemo(
    () => query(collection(db, 'shifts'), where('business_date', '==', today)),
    [today],
  )
  const shifts = useLiveQuery(shiftsQuery, toShift)

  const value = useMemo<DataValue>(() => {
    const memberNames: Record<string, string> = {}
    for (const m of members.data) memberNames[m.id] = m.name

    return {
      today,
      members: members.data,
      memberNames,
      customers: customers.data,
      customersById: new Map(customers.data.map((c) => [c.id, c])),
      utangSales: utangSales.data,
      payments: payments.data,
      todaySales: todaySales.data,
      openShifts: openDutyShifts(shifts.data),
      closures: closures.data,
      closuresById: new Map(closures.data.map((c) => [c.id, c])),
      balances: computeBalances(utangSales.data, payments.data),
      ready: members.ready && customers.ready && utangSales.ready && payments.ready && closures.ready,
    }
  }, [today, members, customers, utangSales, payments, todaySales, shifts, closures])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
