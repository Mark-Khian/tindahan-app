import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AnalyticsSale } from '@/lib/analytics'
import { toSale } from './mappers'

export interface SalesRangeResult {
  sales: AnalyticsSale[]
  fromCache: boolean
  fetchedAt: Date
}

interface Entry {
  result: SalesRangeResult | null
  loading: boolean
  error: Error | null
}

/**
 * One-time reads (no listeners) to keep read costs down. Single-field range on business_date,
 * so no composite index is needed.
 */
async function fetchSalesRange(start: string, end: string): Promise<SalesRangeResult> {
  const snap = await getDocs(
    query(collection(db, 'sales'), where('business_date', '>=', start), where('business_date', '<=', end)),
  )
  const sales = snap.docs.map((d): AnalyticsSale => {
    const s = toSale(d)
    return {
      item_key: s.item_key,
      item_name: s.item_name,
      qty: s.qty,
      subtotal: s.subtotal,
      payment_type: s.payment_type,
      recorded_by: s.recorded_by,
      recorded_at: s.recorded_at.toDate(),
      business_date: s.business_date,
      voided: s.voided,
    }
  })
  return { sales, fromCache: snap.metadata.fromCache, fetchedAt: new Date() }
}

// Session cache: module scope so it survives the tab unmounting.
const cache = new Map<string, Entry>()
const listeners = new Set<() => void>()

function setEntry(key: string, entry: Entry) {
  cache.set(key, entry)
  listeners.forEach((l) => l())
}

function load(key: string, start: string, end: string) {
  const prev = cache.get(key)
  if (prev?.loading) return
  setEntry(key, { result: prev?.result ?? null, loading: true, error: null })
  fetchSalesRange(start, end).then(
    (result) => setEntry(key, { result, loading: false, error: null }),
    (error: Error) => {
      console.error('[analytics fetch]', error)
      setEntry(key, { result: prev?.result ?? null, loading: false, error })
    },
  )
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const IDLE: Entry = { result: null, loading: true, error: null }

export function useSalesRange(start: string, end: string) {
  const key = `${start}|${end}`
  const entry = useSyncExternalStore(subscribe, () => cache.get(key) ?? IDLE)

  useEffect(() => {
    if (!cache.has(key)) load(key, start, end)
  }, [key, start, end])

  const refresh = useCallback(() => load(key, start, end), [key, start, end])
  return { ...entry, refresh }
}
