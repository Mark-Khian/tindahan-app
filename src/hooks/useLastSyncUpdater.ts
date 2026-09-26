import { useEffect } from 'react'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { LAST_SYNC_THROTTLE_MS } from '@/lib/constants'
import { touchLastSync } from '@/data/writes'

const CHECK_INTERVAL_MS = 15_000

/**
 * When online and all local writes are acknowledged, stamps members/{uid}.last_sync_at
 * with serverTimestamp(), at most once per LAST_SYNC_THROTTLE_MS.
 */
export function useLastSyncUpdater(uid: string) {
  useEffect(() => {
    let cancelled = false
    let inFlight = false
    let lastStamp = 0

    const tick = async () => {
      if (inFlight || !navigator.onLine || Date.now() - lastStamp < LAST_SYNC_THROTTLE_MS) return
      inFlight = true
      try {
        await waitForPendingWrites(db)
        if (cancelled || !navigator.onLine) return
        lastStamp = Date.now()
        touchLastSync(uid).catch((err: unknown) => console.warn('[last_sync_at]', err))
      } catch (err) {
        console.warn('[waitForPendingWrites]', err)
      } finally {
        inFlight = false
      }
    }

    void tick()
    const timer = setInterval(() => void tick(), CHECK_INTERVAL_MS)
    const onOnline = () => void tick()
    window.addEventListener('online', onOnline)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [uid])
}
