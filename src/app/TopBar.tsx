import { CircleUserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncIcon } from '@/components/SyncIcon'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { syncLabels, useSyncStatus } from '@/hooks/useSyncStatus'

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { member } = useAuth()
  const { onDuty, memberNames } = useData()
  const { state } = useSyncStatus()
  const meOnDuty = onDuty?.uid === member.id

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold">{member.name}</div>
        <div className="flex items-center gap-1.5 text-sm">
          <span
            className={`inline-block size-2.5 rounded-full ${onDuty ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
          />
          <span className="truncate text-muted-foreground">
            {onDuty
              ? meOnDuty
                ? 'Ikaw ang on duty'
                : `On duty: ${memberNames[onDuty.uid] ?? '?'}`
              : 'Walang naka-on duty'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1" title={syncLabels[state]}>
        <SyncIcon state={state} />
        <span className="sr-only">{syncLabels[state]}</span>
      </div>
      <Button variant="ghost" size="icon" className="size-12" onClick={onOpenSettings} aria-label="Settings">
        <CircleUserRound className="size-7" />
      </Button>
    </header>
  )
}
