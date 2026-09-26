import { useMemo } from 'react'
import { collection, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toSale } from './mappers'
import { useLiveQuery } from './useLiveQuery'

export function useSalesForDate(businessDate: string) {
  const q = useMemo(
    () => query(collection(db, 'sales'), where('business_date', '==', businessDate)),
    [businessDate],
  )
  return useLiveQuery(q, toSale)
}

/** Most recent business date before `businessDate` that has any sale, or null. */
export function useLastSaleDateBefore(businessDate: string): string | null {
  const q = useMemo(
    () =>
      query(
        collection(db, 'sales'),
        where('business_date', '<', businessDate),
        orderBy('business_date', 'desc'),
        limit(1),
      ),
    [businessDate],
  )
  const { data } = useLiveQuery(q, toSale, false)
  return data[0]?.business_date ?? null
}
