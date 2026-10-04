import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildPurgeEntry, type PurgeCollection } from '@/lib/purgeEntry'
import type { Payment, Sale } from '@/lib/types'
import { commitTracked } from './syncStore'

/** One batch: audit_log/purge_<id>, then delete the voided sale or payment. */
export function purgeVoidedEntry(collection: PurgeCollection, entry: Sale | Payment, uid: string) {
  const plan = buildPurgeEntry(collection, entry, uid)
  const batch = writeBatch(db)
  batch.set(doc(db, 'audit_log', plan.auditId), { ...plan.audit, at: serverTimestamp() })
  batch.delete(doc(db, plan.collection, plan.entryId))
  commitTracked(batch, 'Permanent delete')
}
