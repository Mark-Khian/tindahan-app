/** A shift is open only while it has not been ended. Missing and null both count as open. */
export function isOpenShift(shift: { ended_at: unknown }): boolean {
  return shift.ended_at == null
}

/** Every member with an open shift is on duty. A later closed shift does not replace them. */
export function openDutyShifts<T extends { ended_at: unknown }>(shifts: readonly T[]): T[] {
  return shifts.filter(isOpenShift)
}
