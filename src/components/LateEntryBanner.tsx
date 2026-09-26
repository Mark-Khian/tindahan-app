import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEntryMode, useEntryTarget } from '@/app/entryMode'
import { useData } from '@/data/dataContext'
import { formatBusinessDate } from '@/lib/businessDate'

/** Shown above entry forms: late-entry mode indicator, or the "day is closed" lock. */
export function LateEntryBanner() {
  const { today } = useData()
  const { lateDate, startLateEntry, endLateEntry } = useEntryMode()
  const { blocked } = useEntryTarget()

  if (lateDate) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-amber-900">
        <div>
          <div className="font-bold">LATE ENTRY</div>
          <div className="text-sm">Para sa {formatBusinessDate(lateDate)}</div>
        </div>
        <Button variant="outline" className="h-11 shrink-0" onClick={endLateEntry}>
          Tapos na
        </Button>
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted p-3">
        <div className="flex items-center gap-2">
          <Lock className="size-5 shrink-0" />
          <div className="text-sm">
            Naka-close na ang {formatBusinessDate(today)}. Para magdagdag, gumamit ng Late entry.
          </div>
        </div>
        <Button className="h-11 shrink-0" onClick={() => startLateEntry(today)}>
          Late entry
        </Button>
      </div>
    )
  }

  return null
}
