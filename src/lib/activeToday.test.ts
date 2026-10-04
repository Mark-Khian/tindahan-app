import { describe, expect, it } from 'vitest'
import { activeMembersToday, type ActiveTodayInput, type ActiveTodayMember } from './activeToday'

/** Noon in Manila on 2026-10-05, which is business date 2026-10-05. */
const NOW = new Date('2026-10-05T04:00:00.000Z')
const TODAY = '2026-10-05'

const member = (id: string, lastSyncAt: Date | null): ActiveTodayMember => ({
  id,
  name: id,
  lastSyncAt,
})

function status(overrides: Partial<ActiveTodayInput> & { members: readonly ActiveTodayMember[] }) {
  return activeMembersToday({
    today: TODAY,
    now: NOW,
    dayClosed: false,
    onDutyIds: [],
    shiftMemberIds: [],
    saleMemberIds: [],
    paymentMemberIds: [],
    ...overrides,
  })
}

describe('active members today', () => {
  it('includes someone who is on duty', () => {
    const ana = member('Ana', new Date('2026-10-03T02:00:00.000Z'))
    const result = status({ members: [ana], onDutyIds: ['Ana'] })
    expect(result.showCard).toBe(true)
    expect(result.members.map((m) => m.id)).toEqual(['Ana'])
    expect(result.members[0]?.stale).toBe(true)
  })

  it('includes someone with a shift, sale, or payment today', () => {
    const daysAgo = new Date('2026-10-01T02:00:00.000Z')
    const result = status({
      members: [member('Mia', daysAgo), member('Luis', daysAgo), member('Bea', null)],
      shiftMemberIds: ['Mia'],
      saleMemberIds: ['Luis'],
      paymentMemberIds: ['Bea'],
    })
    expect(result.members.map((m) => m.id)).toEqual(['Mia', 'Luis', 'Bea'])
  })

  it('includes someone whose last sync falls on today, and flags the 30-minute threshold', () => {
    const fresh = member('Ana', new Date(NOW.getTime() - 20 * 60_000))
    const stale = member('Ben', new Date(NOW.getTime() - 45 * 60_000))
    const exactly = member('Cara', new Date(NOW.getTime() - 30 * 60_000))
    const justOver = member('Dan', new Date(NOW.getTime() - 30 * 60_000 - 1))
    const result = status({ members: [fresh, stale, exactly, justOver] })
    expect(result.members.map((m) => [m.id, m.stale])).toEqual([
      ['Ana', false],
      ['Ben', true],
      ['Cara', false],
      ['Dan', true],
    ])
  })

  it('does not treat a sync before the 4:00 AM cutoff as today', () => {
    const beforeCutoff = member('Ana', new Date('2026-10-04T19:00:00.000Z'))
    const afterCutoff = member('Ben', new Date('2026-10-04T20:05:00.000Z'))
    const result = status({ members: [beforeCutoff, afterCutoff] })
    expect(result.members.map((m) => m.id)).toEqual(['Ben'])
  })

  it('excludes a member with no activity today', () => {
    const idle = member('Ana', new Date('2026-10-02T04:00:00.000Z'))
    const never = member('Ben', null)
    const result = status({ members: [idle, never] })
    expect(result.members).toEqual([])
    expect(result.showCard).toBe(true)
  })

  it('hides the card once today is closed', () => {
    const ana = member('Ana', new Date(NOW.getTime() - 10 * 60_000))
    const result = status({ members: [ana], onDutyIds: ['Ana'], dayClosed: true })
    expect(result.showCard).toBe(false)
  })
})
