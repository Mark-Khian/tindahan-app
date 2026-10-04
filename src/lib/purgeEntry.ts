import type { Role } from './types'

export const PURGE_REASON = 'Permanent delete of a voided entry'

export type PurgeCollection = 'sales' | 'payments'

export interface PurgeAudit {
  action: 'purge_entry'
  target_collection: PurgeCollection
  target_id: string
  by: string
  before: Record<string, unknown>
  after: null
  reason: typeof PURGE_REASON
}

export interface PurgePlan {
  /** audit_log document id: purge_<entry id> */
  auditId: string
  audit: PurgeAudit
  collection: PurgeCollection
  entryId: string
}

/** The Deleted entries ⋯ menu is shown only to an admin. */
export function purgeMenuVisible(role: Role): boolean {
  return role === 'admin'
}

/**
 * Document fields for the audit `before` copy. `id` and `pending` exist only on the
 * client object, not on the Firestore document.
 */
export function entrySnapshot<T extends { id: string; pending?: boolean }>(
  entry: T,
): Omit<T, 'id' | 'pending'> {
  const data: Record<string, unknown> = { ...entry }
  delete data.id
  delete data.pending
  return data as Omit<T, 'id' | 'pending'>
}

/** Audit create + entry delete for one permanent purge. `at` is added at commit time. */
export function buildPurgeEntry(
  collection: PurgeCollection,
  entry: { id: string; pending?: boolean },
  uid: string,
): PurgePlan {
  return {
    auditId: `purge_${entry.id}`,
    audit: {
      action: 'purge_entry',
      target_collection: collection,
      target_id: entry.id,
      by: uid,
      before: entrySnapshot(entry),
      after: null,
      reason: PURGE_REASON,
    },
    collection,
    entryId: entry.id,
  }
}
