import { useMemo, useState, type ReactNode } from 'react'
import { EntryModeContext, type EntryModeValue } from './entryMode'

export function EntryModeProvider({ children }: { children: ReactNode }) {
  const [lateDate, setLateDate] = useState<string | null>(null)
  const value = useMemo<EntryModeValue>(
    () => ({
      lateDate,
      startLateEntry: setLateDate,
      endLateEntry: () => setLateDate(null),
    }),
    [lateDate],
  )
  return <EntryModeContext.Provider value={value}>{children}</EntryModeContext.Provider>
}
