import { Cloud, CloudOff, CloudUpload, RefreshCw } from 'lucide-react'
import { syncLabels, type SyncState } from '@/hooks/useSyncStatus'

export function SyncIcon({ state, className = 'size-6' }: { state: SyncState; className?: string }) {
  switch (state) {
    case 'synced':
      return <Cloud className={`${className} text-emerald-600`} aria-label={syncLabels.synced} />
    case 'pending':
      return <CloudUpload className={`${className} text-amber-600`} aria-label={syncLabels.pending} />
    case 'offline':
      return <CloudOff className={`${className} text-muted-foreground`} aria-label={syncLabels.offline} />
    case 'connecting':
      return <RefreshCw className={`${className} text-muted-foreground`} aria-label={syncLabels.connecting} />
  }
}
