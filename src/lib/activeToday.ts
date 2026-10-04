import { getBusinessDate } from './businessDate'
import { STALE_SYNC_MINUTES } from './constants'

export interface ActiveTodayMember {
  id: string
  name: string
  lastSyncAt: Date | null
}

export interface ActiveTodayInput {
  /** Current business date (YYYY-MM-DD). */
  today: string
  now: Date
  /** True when today's business date already has a closing. */
  dayClosed: boolean
  members: readonly ActiveTodayMember[]
  /** Members currently on duty. */
  onDutyIds: readonly string[]
  /** Members with any shift document on `today`, open or ended. */
  shiftMemberIds: readonly string[]
  /** Members with a sale on `today`. */
  saleMemberIds: readonly string[]
  /** Members with a payment on `today`. */
  paymentMemberIds: readonly string[]
}

export interface ListedSyncMember extends ActiveTodayMember {
  /** True when last sync is missing or older than the 30-minute threshold. */
  stale: boolean
}

export interface ActiveTodayStatus {
  /** Sync status card is shown only while today is still open. */
  showCard: boolean
  members: ListedSyncMember[]
}

function isStaleSync(lastSyncAt: Date | null, now: Date): boolean {
  if (!lastSyncAt) return true
  return now.getTime() - lastSyncAt.getTime() > STALE_SYNC_MINUTES * 60_000
}

/**
 * Members to list on the Close Day sync card: on duty, or with a shift, sale,
 * or payment today, or whose last sync falls on today's business date.
 */
export function activeMembersToday(input: ActiveTodayInput): ActiveTodayStatus {
  const activeIds = new Set<string>([
    ...input.onDutyIds,
    ...input.shiftMemberIds,
    ...input.saleMemberIds,
    ...input.paymentMemberIds,
  ])
  for (const member of input.members) {
    if (member.lastSyncAt && getBusinessDate(member.lastSyncAt) === input.today) {
      activeIds.add(member.id)
    }
  }

  const members = input.members
    .filter((member) => activeIds.has(member.id))
    .map((member) => ({ ...member, stale: isStaleSync(member.lastSyncAt, input.now) }))

  return { showCard: !input.dayClosed, members }
}
