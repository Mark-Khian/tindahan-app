export const TIMEZONE = 'Asia/Manila'

/** Entries from 04:00 until 03:59 the next day belong to the same business date. */
export const BUSINESS_DAY_CUTOFF_HOUR = 4

/** Close Day warns when a member's last_sync_at is older than this. */
export const STALE_SYNC_MINUTES = 30

/** members/{uid}.last_sync_at is updated at most this often. */
export const LAST_SYNC_THROTTLE_MS = 60_000

/** Item autocomplete looks back this many business days of sales (utang sales are always included). */
export const AUTOCOMPLETE_WINDOW_DAYS = 60

export const MAX_SUGGESTIONS = 6
