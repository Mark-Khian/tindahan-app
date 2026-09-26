import { useSyncExternalStore } from 'react'
import { syncStore } from '@/data/syncStore'
import { useOnline } from './useOnline'

export type SyncState = 'offline' | 'pending' | 'synced' | 'connecting'

export const syncLabels: Record<SyncState, string> = {
  synced: 'Naka-sync',
  pending: 'May hindi pa na-sync',
  offline: 'Offline',
  connecting: 'Kumokonekta...',
}

export function useSyncStatus() {
  const online = useOnline()
  const snap = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot)
  const hasPendingWrites = snap.writesPending || snap.listenersPending

  let state: SyncState
  if (!online) state = 'offline'
  else if (hasPendingWrites) state = 'pending'
  else if (snap.listenersFromCache) state = 'connecting'
  else state = 'synced'

  return { state, online, hasPendingWrites, errors: snap.errors }
}
