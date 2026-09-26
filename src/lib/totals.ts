import { fromCentavos, toCentavos } from './money'
import type { DayTotals, MemberTotals } from './types'

export interface TotalsSale {
  payment_type: 'cash' | 'utang'
  subtotal: number
  recorded_by: string
  voided: boolean
}

export interface TotalsPayment {
  amount: number
  received_by: string
  voided: boolean
}

interface CentavoTotals {
  gross: number
  cash_sales: number
  utang_sales: number
  payments: number
}

/** Totals for one business date. Voided entries are excluded. */
export function computeDayTotals(
  sales: readonly TotalsSale[],
  payments: readonly TotalsPayment[],
  memberNames: Readonly<Record<string, string>>,
): DayTotals {
  const all: CentavoTotals = { gross: 0, cash_sales: 0, utang_sales: 0, payments: 0 }
  const perMember = new Map<string, CentavoTotals>()
  const bucket = (uid: string) => {
    let b = perMember.get(uid)
    if (!b) {
      b = { gross: 0, cash_sales: 0, utang_sales: 0, payments: 0 }
      perMember.set(uid, b)
    }
    return b
  }

  for (const s of sales) {
    if (s.voided) continue
    const c = toCentavos(s.subtotal)
    const m = bucket(s.recorded_by)
    all.gross += c
    m.gross += c
    if (s.payment_type === 'cash') {
      all.cash_sales += c
      m.cash_sales += c
    } else {
      all.utang_sales += c
      m.utang_sales += c
    }
  }
  for (const p of payments) {
    if (p.voided) continue
    const c = toCentavos(p.amount)
    all.payments += c
    bucket(p.received_by).payments += c
  }

  const per_member: Record<string, MemberTotals> = {}
  for (const [uid, t] of perMember) {
    per_member[uid] = {
      name: memberNames[uid] ?? 'Unknown',
      gross: fromCentavos(t.gross),
      cash_sales: fromCentavos(t.cash_sales),
      utang_sales: fromCentavos(t.utang_sales),
      payments: fromCentavos(t.payments),
    }
  }

  return {
    gross: fromCentavos(all.gross),
    cash_sales: fromCentavos(all.cash_sales),
    utang_sales: fromCentavos(all.utang_sales),
    utang_payments: fromCentavos(all.payments),
    expected_cash: fromCentavos(all.cash_sales + all.payments),
    per_member,
  }
}

/** True when the headline figures of two totals differ (e.g. late entries or voids after closing). */
export function totalsDiffer(a: DayTotals, b: DayTotals): boolean {
  const keys = ['gross', 'cash_sales', 'utang_sales', 'utang_payments', 'expected_cash'] as const
  return keys.some((k) => toCentavos(a[k]) !== toCentavos(b[k]))
}
