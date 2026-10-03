import { describe, expect, it } from 'vitest'
import { beginGuardedSave, describeDuty } from './dutyGate'

const actions = () => {
  const calls: string[] = []
  return {
    calls,
    save: () => calls.push('save'),
    goOnDuty: () => calls.push('duty'),
  }
}

describe('duty save gate', () => {
  it('opens a dialog when the current user is not on duty', () => {
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: false, otherName: null }, act)
    expect(gate.prompt).toEqual({
      title: "You're not on duty. Go on duty first?",
      confirmLabel: 'Go on duty',
    })
    expect(act.calls).toEqual([])
  })

  it('names the person already on duty in the take-over dialog', () => {
    const duty = describeDuty({
      myUid: 'me',
      openShifts: [
        { uid: 'ben', startedAt: 1 },
        { uid: 'mama', startedAt: 2 },
      ],
      names: { mama: 'Mama', ben: 'Ben' },
      pendingOnDutyUid: null,
    })
    expect(duty).toEqual({ meOnDuty: false, otherName: 'Mama' })
    const gate = beginGuardedSave({ meOnDuty: false, otherName: duty.otherName }, actions())
    expect(gate.prompt).toEqual({
      title: 'Mama is on duty. Take over?',
      confirmLabel: 'Take over',
    })
  })

  it('saves directly when the current user is on duty', () => {
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: true, otherName: null }, act)
    expect(gate.prompt).toBeNull()
    expect(act.calls).toEqual(['save'])
  })

  it('treats a pending local on-duty write as already on duty', () => {
    const duty = describeDuty({
      myUid: 'me',
      openShifts: [],
      names: {},
      pendingOnDutyUid: 'me',
    })
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: duty.meOnDuty, otherName: duty.otherName }, act)
    expect(duty.meOnDuty).toBe(true)
    expect(gate.prompt).toBeNull()
    expect(act.calls).toEqual(['save'])
  })

  it('saves nothing when cancelled', () => {
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: false, otherName: null }, act)
    gate.cancel()
    gate.confirm()
    expect(act.calls).toEqual([])
  })

  it('goes on duty and then saves when confirmed', () => {
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: false, otherName: 'Mama' }, act)
    gate.confirm()
    expect(act.calls).toEqual(['duty', 'save'])
  })

  it('does not ask again for a late entry', () => {
    const act = actions()
    const gate = beginGuardedSave({ meOnDuty: false, otherName: 'Mama', skip: true }, act)
    expect(gate.prompt).toBeNull()
    expect(act.calls).toEqual(['save'])
  })
})
