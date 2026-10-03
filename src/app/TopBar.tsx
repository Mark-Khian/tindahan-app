import { CircleUserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncIcon } from '@/components/SyncIcon'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { useSyncStatus, type SyncState } from '@/hooks/useSyncStatus'
import type { Shift } from '@/lib/types'

function latestOpenShift(shifts: readonly Shift[]): Shift | null {
  let latest: Shift | null = null
  for (const shift of shifts) {
    if (!latest || startedAt(shift) >= startedAt(latest)) latest = shift
  }
  return latest
}

function startedAt(shift: Shift): number {
  return shift.started_at?.toMillis?.() ?? 0
}

/** Pending docs already loaded on this device. Today's utang sales are counted once. */
function pendingWriteCount(data: ReturnType<typeof useData>): number {
  const todayIds = new Set(data.todaySales.map((sale) => sale.id))
  let count = data.todaySales.filter((sale) => sale.pending).length
  for (const sale of data.utangSales) {
    if (sale.pending && !todayIds.has(sale.id)) count += 1
  }
  count += data.payments.filter((payment) => payment.pending).length
  count += data.customers.filter((customer) => customer.pending).length
  count += data.closures.filter((closure) => closure.pending).length
  return count
}

function syncStatusText(state: SyncState, pendingCount: number): string {
  if (state === 'offline') {
    return pendingCount > 0 ? `Offline · ${pendingCount} not synced` : 'Offline'
  }
  if (state === 'pending') return 'Syncing…'
  if (state === 'connecting') return 'Connecting…'
  return 'Synced'
}

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { member } = useAuth()
  const data = useData()
  const { state } = useSyncStatus()
  const latest = latestOpenShift(data.openShifts)
  const status = !latest
    ? 'No one on duty'
    : latest.uid === member.id
      ? 'On duty: You'
      : `On duty: ${data.memberNames[latest.uid] ?? '?'}`
  const syncText = syncStatusText(state, pendingWriteCount(data))

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold">{member.name}</div>
        <div className="flex items-center gap-1.5 text-sm">
          <span
            className={`inline-block size-2.5 shrink-0 rounded-full ${latest ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
          />
          <span className="truncate text-muted-foreground">{status}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-muted-foreground" title={syncText}>
        <SyncIcon state={state} className="size-5" />
        <span className="text-[11px] leading-tight whitespace-nowrap">{syncText}</span>
      </div>
      <Button variant="ghost" size="icon" className="size-12 shrink-0" onClick={onOpenSettings} aria-label="Settings">
        <CircleUserRound className="size-7" />
      </Button>
    </header>
  )
}
