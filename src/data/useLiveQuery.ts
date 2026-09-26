import { useEffect, useId, useState } from 'react'
import {
  onSnapshot,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { reportListenerStatus } from './syncStore'

interface LiveState<T> {
  query: Query
  data: T[]
  fromCache: boolean
  error: Error | null
}

export interface LiveResult<T> {
  data: T[]
  ready: boolean
  fromCache: boolean
  error: Error | null
}

const EMPTY: never[] = []

/**
 * Subscribes to a query with metadata changes so pending-write markers update when the
 * server acknowledges. `query` and `map` must be referentially stable (useMemo / module scope).
 * When `track` is true, this listener feeds the global sync indicator.
 */
export function useLiveQuery<T>(
  query: Query | null,
  map: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  track = true,
): LiveResult<T> {
  const id = useId()
  const [state, setState] = useState<LiveState<T> | null>(null)

  useEffect(() => {
    if (!query) return
    const unsubscribe = onSnapshot(
      query,
      { includeMetadataChanges: true },
      (snap) => {
        setState({
          query,
          data: snap.docs.map(map),
          fromCache: snap.metadata.fromCache,
          error: null,
        })
        if (track) {
          reportListenerStatus(id, {
            pending: snap.metadata.hasPendingWrites,
            fromCache: snap.metadata.fromCache,
          })
        }
      },
      (error) => {
        console.error('[listener error]', error)
        setState({ query, data: [], fromCache: true, error })
      },
    )
    return () => {
      unsubscribe()
      if (track) reportListenerStatus(id, null)
    }
  }, [query, map, track, id])

  const current = state && state.query === query ? state : null
  return {
    data: current?.data ?? EMPTY,
    ready: current !== null,
    fromCache: current?.fromCache ?? true,
    error: current?.error ?? null,
  }
}
