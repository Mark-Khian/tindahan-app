import type { DayTotals, Role } from './types'

export interface ClosingSnapshot {
  id: string
  closed_by: string
  closed_at: unknown
  totals: DayTotals
  /** Client-only. Not part of the stored closing. */
  pending?: boolean
}

export interface DeleteCloseDayAudit {
  action: 'delete_close_day'
  target_collection: 'day_closures'
  target_id: string
  by: string
  /** Stored closing fields: closed_by, closed_at, totals. */
  before: {
    closed_by: string
    closed_at: unknown
    totals: DayTotals
  }
  after: null
  reason: null
}

export interface DeleteCloseDayPlan {
  /** day_closures document to delete. */
  closureId: string
  audit: DeleteCloseDayAudit
}

/** The Past closings ⋯ menu is shown only to an admin. */
export function deleteClosingMenuVisible(role: Role): boolean {
  return role === 'admin'
}

/** Delete day_closures/{id} and write the delete_close_day audit with a full before copy. */
export function buildDeleteCloseDay(closure: ClosingSnapshot, uid: string): DeleteCloseDayPlan {
  return {
    closureId: closure.id,
    audit: {
      action: 'delete_close_day',
      target_collection: 'day_closures',
      target_id: closure.id,
      by: uid,
      before: {
        closed_by: closure.closed_by,
        closed_at: closure.closed_at,
        totals: closure.totals,
      },
      after: null,
      reason: null,
    },
  }
}
