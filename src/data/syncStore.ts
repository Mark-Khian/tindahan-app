import { FirebaseError } from 'firebase/app'
import { waitForPendingWrites, type WriteBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface WriteError {
  id: number
  label: string
  message: string
}

interface SyncSnapshot {
  /** This device has writes that the server has not acknowledged yet. */
  writesPending: boolean
  /** At least one tracked listener has local changes not yet on the server. */
  listenersPending: boolean
  /** At least one tracked listener is serving cached data (not connected to the backend). */
  listenersFromCache: boolean
  errors: WriteError[]
}

interface ListenerStatus {
  pending: boolean
  fromCache: boolean
}

let snapshot: SyncSnapshot = {
  writesPending: false,
  listenersPending: false,
  listenersFromCache: false,
  errors: [],
}
const subscribers = new Set<() => void>()
const listenerStatus = new Map<string, ListenerStatus>()
let generation = 0
let errorSeq = 0

function emit(patch: Partial<SyncSnapshot>) {
  const next = { ...snapshot, ...patch }
  const changed = (Object.keys(patch) as (keyof SyncSnapshot)[]).some((k) => next[k] !== snapshot[k])
  if (!changed) return
  snapshot = next
  subscribers.forEach((fn) => fn())
}

export const syncStore = {
  subscribe(fn: () => void) {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  },
  getSnapshot: () => snapshot,
}

export function reportListenerStatus(id: string, status: ListenerStatus | null) {
  if (status) listenerStatus.set(id, status)
  else listenerStatus.delete(id)
  let pending = false
  let fromCache = false
  for (const s of listenerStatus.values()) {
    pending ||= s.pending
    fromCache ||= s.fromCache
  }
  emit({ listenersPending: pending, listenersFromCache: fromCache })
}

function describeError(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === 'permission-denied') {
      return 'Tinanggihan ng server (baka naka-close na ang araw, o walang permiso).'
    }
    return `${err.code}: ${err.message}`
  }
  return String(err)
}

export function dismissWriteError(id: number) {
  emit({ errors: snapshot.errors.filter((e) => e.id !== id) })
}

/**
 * Commits a batch without awaiting it: offline, commit() only resolves once the server
 * acknowledges, but the local cache (and UI) update immediately.
 */
export function commitTracked(batch: WriteBatch, label: string) {
  const gen = ++generation
  emit({ writesPending: true })
  batch
    .commit()
    .catch((err: unknown) => {
      console.error(`[write failed] ${label}`, err)
      emit({ errors: [...snapshot.errors, { id: ++errorSeq, label, message: describeError(err) }] })
    })
    .finally(() => {
      // Writes are acknowledged in order, so the latest one settling means all earlier ones did.
      if (gen === generation) emit({ writesPending: false })
    })
}

/** Detects writes persisted from a previous session that are still waiting to sync. */
export function checkPersistedPendingWrites() {
  const gen = ++generation
  let settled = false
  waitForPendingWrites(db)
    .then(() => {
      settled = true
      if (gen === generation) emit({ writesPending: false })
    })
    .catch(() => {})
  setTimeout(() => {
    if (!settled && gen === generation) emit({ writesPending: true })
  }, 800)
}
