/**
 * UX-only gate: current-day saves ask the user to go on duty first.
 * Shift writes themselves stay in the existing startShift / endShift functions.
 */

export interface DutyShift {
  uid: string
  startedAt: number
}

export interface DutySnapshot {
  myUid: string
  /** Open shifts already in the local cache, including ones still waiting to sync. */
  openShifts: readonly DutyShift[]
  names: Readonly<Record<string, string>>
  /** Set when this device has started an on-duty write that may not be in openShifts yet. */
  pendingOnDutyUid: string | null
}

export interface DutyView {
  meOnDuty: boolean
  /** Someone else is the latest person on duty. Null when nobody is, or the current user is. */
  otherName: string | null
}

export interface DutyPrompt {
  title: string
  confirmLabel: string
}

export interface GuardedSave {
  prompt: DutyPrompt | null
  confirm: () => void
  cancel: () => void
}

let startLocked = false
let pendingOnDutyUid: string | null = null

export function currentPendingOnDuty(): string | null {
  return pendingOnDutyUid
}

/** Remembers a local on-duty write and calls the existing startShift once. */
export function requestStartDuty(uid: string, startShift: (uid: string) => void) {
  if (startLocked || pendingOnDutyUid === uid) return
  startLocked = true
  pendingOnDutyUid = uid
  startShift(uid)
}

export function releaseDutyStartLock() {
  startLocked = false
}

export function clearPendingOnDuty(uid: string) {
  if (pendingOnDutyUid === uid) pendingOnDutyUid = null
}

export function describeDuty(snapshot: DutySnapshot): DutyView {
  const meOnDuty =
    snapshot.pendingOnDutyUid === snapshot.myUid ||
    snapshot.openShifts.some((shift) => shift.uid === snapshot.myUid)
  if (meOnDuty) return { meOnDuty: true, otherName: null }

  let latest: DutyShift | null = null
  for (const shift of snapshot.openShifts) {
    if (!latest || shift.startedAt >= latest.startedAt) latest = shift
  }
  if (!latest) return { meOnDuty: false, otherName: null }
  return { meOnDuty: false, otherName: snapshot.names[latest.uid] ?? '?' }
}

export function dutyPrompt(otherName: string | null): DutyPrompt {
  if (otherName) {
    return { title: `${otherName} is on duty. Take over?`, confirmLabel: 'Take over' }
  }
  return { title: "You're not on duty. Go on duty first?", confirmLabel: 'Go on duty' }
}

/** Saves immediately when allowed. Otherwise holds the save until confirm. Cancel stores nothing. */
export function beginGuardedSave(
  input: { meOnDuty: boolean; otherName: string | null; skip?: boolean },
  actions: { save: () => void; goOnDuty: () => void },
): GuardedSave {
  if (input.skip || input.meOnDuty) {
    actions.save()
    return { prompt: null, confirm() {}, cancel() {} }
  }

  const prompt = dutyPrompt(input.otherName)
  let settled = false
  return {
    prompt,
    confirm() {
      if (settled) return
      settled = true
      actions.goOnDuty()
      actions.save()
    },
    cancel() {
      settled = true
    },
  }
}
