import { fromCentavos, toCentavos } from './money'

export interface BalanceSale {
  payment_type: 'cash' | 'utang'
  customer_id: string | null
  subtotal: number
  voided: boolean
}

export interface BalancePayment {
  customer_id: string
  amount: number
  voided: boolean
}

/**
 * Utang balance per customer_id, computed (never stored):
 * sum(non-voided utang sales) − sum(non-voided payments).
 */
export function computeBalances(
  sales: readonly BalanceSale[],
  payments: readonly BalancePayment[],
): Map<string, number> {
  const centavos = new Map<string, number>()
  for (const s of sales) {
    if (s.payment_type !== 'utang' || s.voided || !s.customer_id) continue
    centavos.set(s.customer_id, (centavos.get(s.customer_id) ?? 0) + toCentavos(s.subtotal))
  }
  for (const p of payments) {
    if (p.voided) continue
    centavos.set(p.customer_id, (centavos.get(p.customer_id) ?? 0) - toCentavos(p.amount))
  }
  const balances = new Map<string, number>()
  for (const [id, c] of centavos) balances.set(id, fromCentavos(c))
  return balances
}

/** customer_ids with at least one non-voided utang sale or non-voided payment. */
export function customersWithActiveEntries(
  sales: readonly BalanceSale[],
  payments: readonly BalancePayment[],
): Set<string> {
  const ids = new Set<string>()
  for (const s of sales) {
    if (s.payment_type === 'utang' && !s.voided && s.customer_id) ids.add(s.customer_id)
  }
  for (const p of payments) {
    if (!p.voided) ids.add(p.customer_id)
  }
  return ids
}

export function balanceFor(
  customerId: string,
  sales: readonly BalanceSale[],
  payments: readonly BalancePayment[],
): number {
  return computeBalances(
    sales.filter((s) => s.customer_id === customerId),
    payments.filter((p) => p.customer_id === customerId),
  ).get(customerId) ?? 0
}

export type PaymentValidation = 'ok' | 'not_positive' | 'exceeds_balance'

export function validatePaymentAmount(amount: number, balance: number): PaymentValidation {
  const a = toCentavos(amount)
  if (!(a > 0)) return 'not_positive'
  if (a > toCentavos(balance)) return 'exceeds_balance'
  return 'ok'
}
