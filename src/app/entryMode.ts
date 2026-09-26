import { createContext, useCallback, useContext } from 'react'
import { useData } from '@/data/dataContext'
import type { EntryTarget } from '@/data/writes'
import { getBusinessDate } from '@/lib/businessDate'

export interface EntryModeValue {
  /** When set, new entries go to this (closed) business date as late entries. */
  lateDate: string | null
  startLateEntry: (businessDate: string) => void
  endLateEntry: () => void
}

export const EntryModeContext = createContext<EntryModeValue | null>(null)

export function useEntryMode(): EntryModeValue {
  const value = useContext(EntryModeContext)
  if (!value) throw new Error('useEntryMode must be used inside <EntryModeProvider>')
  return value
}

/**
 * Where a new entry should go. Normal entries use the business date at save time and are
 * blocked once that date is closed; the explicit "Late entry" mode is the only way in.
 */
export function useEntryTarget() {
  const { today, closuresById } = useData()
  const { lateDate } = useEntryMode()
  const isLate = lateDate !== null

  const resolveTarget = useCallback((): EntryTarget | null => {
    if (lateDate) return { business_date: lateDate, is_late_entry: true }
    const date = getBusinessDate(new Date())
    if (closuresById.has(date)) return null
    return { business_date: date, is_late_entry: false }
  }, [lateDate, closuresById])

  return {
    /** Business date that the entry forms currently write to. */
    entryDate: lateDate ?? today,
    isLate,
    blocked: !isLate && closuresById.has(today),
    resolveTarget,
  }
}
