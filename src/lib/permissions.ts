import type { Member, Payment, Sale } from './types'

/** Own entries, or any entry if admin. Mirrors the Firestore rules. */
export function canVoid(entry: Sale | Payment, member: Member): boolean {
  if (entry.voided) return false
  const owner = 'recorded_by' in entry ? entry.recorded_by : entry.received_by
  return owner === member.id || member.role === 'admin'
}
