import { describe, expect, it } from 'vitest'
import { isOpenShift, openDutyShifts } from './duty'

const shift = (uid: string, ended_at: number | null) => ({
  uid,
  ended_at: ended_at === null ? null : { toMillis: () => ended_at },
})

describe('open duty shifts', () => {
  it('treats a null end as on duty and a timestamp as off duty', () => {
    expect(isOpenShift(shift('ana', null))).toBe(true)
    expect(isOpenShift(shift('ana', 1_700_000_000_000))).toBe(false)
  })

  it('keeps every member who still has an open shift', () => {
    const open = openDutyShifts([
      shift('ana', null),
      shift('ben', null),
      shift('carlos', 1_700_000_000_000),
    ])
    expect(open.map((s) => s.uid)).toEqual(['ana', 'ben'])
  })

  it('does not let a newer closed shift clear an earlier open one', () => {
    const open = openDutyShifts([
      { uid: 'ana', started_at: 1, ended_at: null },
      { uid: 'ben', started_at: 2, ended_at: { toMillis: () => 3 } },
    ])
    expect(open.map((s) => s.uid)).toEqual(['ana'])
  })

  it('allows the same member to have a closed shift and a later open one', () => {
    const open = openDutyShifts([
      shift('ana', 1),
      shift('ana', null),
    ])
    expect(open).toHaveLength(1)
    expect(open[0]?.uid).toBe('ana')
  })
})
