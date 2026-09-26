import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { addDays } from '@/lib/businessDate'
import { AUTOCOMPLETE_WINDOW_DAYS } from '@/lib/constants'
import { useData } from '@/data/dataContext'
import { useOnline } from './useOnline'

const STORAGE_KEY = 'tindahan:item-suggestions:v1'

interface ItemEntry {
  name: string
  lastDate: string
}

interface SuggestionCache {
  /** Business date up to which past sales have been fetched from the server. */
  syncedThrough: string | null
  items: Record<string, ItemEntry>
}

function loadCache(): SuggestionCache {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SuggestionCache
  } catch {
    // ignore corrupt cache
  }
  return { syncedThrough: null, items: {} }
}

function merge(items: Record<string, ItemEntry>, key: string, name: string, date: string) {
  const existing = items[key]
  if (!existing || existing.lastDate <= date) items[key] = { name, lastDate: date }
}

/**
 * Distinct item names from the last AUTOCOMPLETE_WINDOW_DAYS of sales plus all utang sales.
 * Past days are fetched incrementally and cached in localStorage so each device reads each
 * sale roughly once; today's items come from the live listener.
 */
export function useItemSuggestions(): string[] {
  const { today, todaySales, utangSales } = useData()
  const online = useOnline()
  const [cache, setCache] = useState<SuggestionCache>(loadCache)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  }, [cache])

  useEffect(() => {
    if (!online || cache.syncedThrough === today) return
    let cancelled = false
    const windowStart = addDays(today, -AUTOCOMPLETE_WINDOW_DAYS)
    const from =
      cache.syncedThrough && cache.syncedThrough > windowStart
        ? addDays(cache.syncedThrough, -1)
        : windowStart

    getDocs(query(collection(db, 'sales'), where('business_date', '>=', from)))
      .then((snap) => {
        if (cancelled || snap.metadata.fromCache) return
        setCache((prev) => {
          const items: Record<string, ItemEntry> = {}
          for (const [k, v] of Object.entries(prev.items)) {
            if (v.lastDate >= windowStart) items[k] = v
          }
          for (const d of snap.docs) {
            const s = d.data()
            if (s.voided || typeof s.item_key !== 'string') continue
            merge(items, s.item_key, s.item_name, s.business_date)
          }
          return { syncedThrough: today, items }
        })
      })
      .catch((err: unknown) => console.warn('[item suggestions]', err))

    return () => {
      cancelled = true
    }
  }, [online, today, cache.syncedThrough])

  return useMemo(() => {
    const items: Record<string, ItemEntry> = { ...cache.items }
    for (const s of utangSales) if (!s.voided) merge(items, s.item_key, s.item_name, s.business_date)
    for (const s of todaySales) if (!s.voided) merge(items, s.item_key, s.item_name, s.business_date)
    return Object.values(items)
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name))
      .map((i) => i.name)
  }, [cache.items, utangSales, todaySales])
}
