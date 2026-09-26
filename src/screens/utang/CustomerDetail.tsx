import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PaymentRow, PendingBadge, SaleRow } from '@/components/EntryRows'
import { VoidDialog } from '@/components/VoidDialog'
import { useData } from '@/data/dataContext'
import type { VoidTarget } from '@/data/writes'
import { formatPeso } from '@/lib/money'
import type { Payment, Sale } from '@/lib/types'

type HistoryItem = { kind: 'sale'; at: number; sale: Sale } | { kind: 'payment'; at: number; payment: Payment }

interface Props {
  customerId: string
  onBack: () => void
  onMagUtang: () => void
  onBayad: () => void
}

export function CustomerDetail({ customerId, onBack, onMagUtang, onBayad }: Props) {
  const { customersById, utangSales, payments, balances } = useData()
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const customer = customersById.get(customerId)
  const balance = balances.get(customerId) ?? 0

  const history = useMemo<HistoryItem[]>(() => {
    const items: HistoryItem[] = [
      ...utangSales
        .filter((s) => s.customer_id === customerId)
        .map((sale): HistoryItem => ({ kind: 'sale', at: sale.recorded_at.toMillis(), sale })),
      ...payments
        .filter((p) => p.customer_id === customerId)
        .map((payment): HistoryItem => ({ kind: 'payment', at: payment.received_at.toMillis(), payment })),
    ]
    return items.sort((a, b) => b.at - a.at)
  }, [utangSales, payments, customerId])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-12 self-start px-2 text-base" onClick={onBack}>
        <ArrowLeft className="size-5" /> Lahat ng customer
      </Button>

      <Card className="py-4">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold break-words">{customer?.name ?? '?'}</h1>
            {customer?.pending && <PendingBadge />}
          </div>
          <div>
            <div className="text-muted-foreground">Utang</div>
            <div className="text-4xl font-bold">{formatPeso(balance)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-14 text-lg" onClick={onMagUtang}>
              Mag-utang
            </Button>
            <Button variant="secondary" className="h-14 text-lg" onClick={onBayad} disabled={balance <= 0}>
              Bayad
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-1 text-lg font-bold">History</h2>
        {history.length === 0 && <p className="py-6 text-center text-muted-foreground">Wala pang record.</p>}
        <ul>
          {history.map((h) =>
            h.kind === 'sale' ? (
              <SaleRow
                key={h.sale.id}
                sale={h.sale}
                showCustomer={false}
                showDate
                onVoid={(entry) => setVoidTarget({ kind: 'sales', entry })}
              />
            ) : (
              <PaymentRow
                key={h.payment.id}
                payment={h.payment}
                showDate
                onVoid={(entry) => setVoidTarget({ kind: 'payments', entry })}
              />
            ),
          )}
        </ul>
      </section>

      <VoidDialog target={voidTarget} onClose={() => setVoidTarget(null)} />
    </div>
  )
}
