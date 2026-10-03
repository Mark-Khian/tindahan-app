import type { ReactNode } from 'react'
import { CloudUpload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { formatBusinessDate, formatTime } from '@/lib/businessDate'
import { formatPeso } from '@/lib/money'
import { canVoid } from '@/lib/permissions'
import type { Payment, Sale } from '@/lib/types'

export function PendingBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-amber-400 bg-amber-50 text-amber-800">
      <CloudUpload className="size-3" />
      pending
    </Badge>
  )
}

function RowShell({
  children,
  amount,
  onVoid,
}: {
  children: ReactNode
  amount: string
  onVoid?: () => void
}) {
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-lg font-bold">{amount}</span>
        {onVoid && (
          <Button variant="ghost" size="sm" className="h-9 text-destructive" onClick={onVoid}>
            Delete
          </Button>
        )}
      </div>
    </li>
  )
}

export function SaleRow({
  sale,
  onVoid,
  showCustomer = true,
  showDate = false,
}: {
  sale: Sale
  onVoid: (sale: Sale) => void
  showCustomer?: boolean
  showDate?: boolean
}) {
  const { member } = useAuth()
  const { memberNames, customersById } = useData()
  const when = sale.recorded_at?.toDate()
  return (
    <RowShell amount={formatPeso(sale.subtotal)} onVoid={canVoid(sale, member) ? () => onVoid(sale) : undefined}>
      <div className="text-lg font-semibold break-words">{sale.item_name}</div>
      <div className="text-muted-foreground">
        {sale.qty} × {formatPeso(sale.unit_price)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span>
          {memberNames[sale.recorded_by] ?? '?'} · {showDate && `${formatBusinessDate(sale.business_date)} · `}
          {when ? formatTime(when) : ''}
        </span>
        {sale.payment_type === 'utang' && showCustomer && (
          <Badge variant="secondary">Credit: {customersById.get(sale.customer_id ?? '')?.name ?? '?'}</Badge>
        )}
        {sale.is_late_entry && <Badge variant="outline">late entry</Badge>}
        {sale.pending && <PendingBadge />}
      </div>
    </RowShell>
  )
}

export function PaymentRow({
  payment,
  onVoid,
  showDate = false,
}: {
  payment: Payment
  onVoid: (payment: Payment) => void
  showDate?: boolean
}) {
  const { member } = useAuth()
  const { memberNames } = useData()
  const when = payment.received_at?.toDate()
  return (
    <RowShell
      amount={`−${formatPeso(payment.amount)}`}
      onVoid={canVoid(payment, member) ? () => onVoid(payment) : undefined}
    >
      <div className="text-lg font-semibold text-emerald-700">Bayad</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span>
          {memberNames[payment.received_by] ?? '?'} ·{' '}
          {showDate && `${formatBusinessDate(payment.business_date)} · `}
          {when ? formatTime(when) : ''}
        </span>
        {payment.is_late_entry && <Badge variant="outline">late entry</Badge>}
        {payment.pending && <PendingBadge />}
      </div>
    </RowShell>
  )
}
