import { normalizeKey } from './normalize'

/** A customer the Add credit form can match by name_key. */
export interface CreditCustomer {
  id: string
  name: string
  name_key: string
}

export type CreditCustomerPlan =
  | { action: 'none' }
  | { action: 'reuse'; id: string; name: string }
  | { action: 'create'; name: string }

/**
 * Who Save all should write. A new customer is planned only when saving and no name_key matches.
 * Cancel and close plan nothing, so no customer doc is created.
 */
export function planCreditCustomer(input: {
  saving: boolean
  selectedId: string | null
  typedName: string
  customers: readonly CreditCustomer[]
}): CreditCustomerPlan {
  if (!input.saving) return { action: 'none' }
  if (input.selectedId) {
    const selected = input.customers.find((customer) => customer.id === input.selectedId)
    return { action: 'reuse', id: input.selectedId, name: selected?.name ?? input.typedName.trim() }
  }
  const key = normalizeKey(input.typedName)
  if (!key) return { action: 'none' }
  const match = input.customers.find((customer) => customer.name_key === key)
  if (match) return { action: 'reuse', id: match.id, name: match.name }
  return { action: 'create', name: input.typedName.trim() }
}

/** Hint under the customer field while a name is typed and not yet picked. */
export function creditCustomerHint(
  typedName: string,
  customers: readonly CreditCustomer[],
): { kind: 'existing' | 'new'; name: string } | null {
  const key = normalizeKey(typedName)
  if (!key) return null
  const match = customers.find((customer) => customer.name_key === key)
  if (match) return { kind: 'existing', name: match.name }
  return { kind: 'new', name: typedName.trim() }
}
