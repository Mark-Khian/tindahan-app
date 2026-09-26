import type { Payment, Sale } from './types'

/** Entries that have not been voided (soft-deleted). */
export function activeEntries<T extends { voided: boolean }>(entries: readonly T[]): T[] {
  return entries.filter((e) => !e.voided)
}

export type DeletedEntry = { kind: 'sale'; entry: Sale } | { kind: 'payment'; entry: Payment }

/** Voided sales and payments, most recently voided first. */
export function deletedEntries(sales: readonly Sale[], payments: readonly Payment[]): DeletedEntry[] {
  const items: DeletedEntry[] = [
    ...sales.filter((s) => s.voided).map((entry): DeletedEntry => ({ kind: 'sale', entry })),
    ...payments.filter((p) => p.voided).map((entry): DeletedEntry => ({ kind: 'payment', entry })),
  ]
  const at = (d: DeletedEntry) => d.entry.voided_at?.toMillis() ?? Number.POSITIVE_INFINITY
  return items.sort((a, b) => at(b) - at(a))
}
