import { planCreditCustomer, type CreditCustomer } from './creditCustomer'
import { normalizeKey } from './normalize'

/** Missing `archived` counts as not archived. */
export function isArchivedCustomer(customer: { archived?: boolean | null }): boolean {
  return customer.archived === true
}

/** Customers shown in the Credit list and search. Archived customers are left out. */
export function visibleCustomers<T extends { archived?: boolean | null; name_key: string }>(
  customers: readonly T[],
  search = '',
): T[] {
  const query = normalizeKey(search)
  return customers.filter(
    (customer) => !isArchivedCustomer(customer) && (!query || customer.name_key.includes(query)),
  )
}

/** Names offered in the Add credit autocomplete. Archived customers are left out. */
export function autocompleteCustomerNames<T extends { archived?: boolean | null; name: string }>(
  customers: readonly T[],
): string[] {
  return customers.filter((customer) => !isArchivedCustomer(customer)).map((customer) => customer.name)
}

/** Paid-up Delete is only for an admin, and only when the balance is exactly ₱0. */
export function canShowPaidUpDelete(role: 'admin' | 'bantay', balance: number): boolean {
  return role === 'admin' && balance === 0
}

export type CreditCustomerSave =
  | { kind: 'none' }
  | { kind: 'create'; name: string }
  | { kind: 'reuse'; id: string }
  | { kind: 'unarchive'; id: string }

/** What Save all does to the customer doc. Cancel changes nothing. */
export function creditCustomerSave(input: {
  saving: boolean
  selectedId: string | null
  typedName: string
  customers: readonly (CreditCustomer & { archived?: boolean | null })[]
}): CreditCustomerSave {
  const plan = planCreditCustomer(input)
  if (plan.action === 'none') return { kind: 'none' }
  if (plan.action === 'create') return { kind: 'create', name: plan.name }
  const match = input.customers.find((customer) => customer.id === plan.id)
  if (isArchivedCustomer(match ?? {})) return { kind: 'unarchive', id: plan.id }
  return { kind: 'reuse', id: plan.id }
}
