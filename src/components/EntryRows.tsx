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
import { cn } from '@/lib/utils'

export function PendingBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-amber-400 bg-amber-50 text-amber-800">
      <CloudUpload className="size-3" />
      pending
    </Badge>
  )
}

function RowShell({
  voided,
  children,
  amount,
  onVoid,
  voidInfo,
}: {
  voided: boolean
  children: ReactNode
  amount: string
  onVoid?: () => void
  voidInfo: string | null
}) {
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <div className={cn('min-w-0 flex-1', voided && 'opacity-50')}>
        {children}
        {voidInfo && <div className="mt-1 text-sm font-medium text-destructive">VOID: {voidInfo}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn('text-lg font-bold', voided && 'line-through opacity-50')}>{amount}</span>
        {onVoid && (
          <Button variant="ghost" size="sm" className="h-9 text-destructive" onClick={onVoid}>
            Void
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
    <RowShell
      voided={sale.voided}
      amount={formatPeso(sale.subtotal)}
      onVoid={canVoid(sale, member) ? () => onVoid(sale) : undefined}
      voidInfo={sale.voided ? sale.void_reason : null}
    >
      <div className={cn('text-lg font-semibold break-words', sale.voided && 'line-through')}>
        {sale.item_name}
      </div>
      <div className={cn('text-muted-foreground', sale.voided && 'line-through')}>
        {sale.qty} × {formatPeso(sale.unit_price)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span>
          {memberNames[sale.recorded_by] ?? '?'} · {showDate && `${formatBusinessDate(sale.business_date)} · `}
          {when ? formatTime(when) : ''}
        </span>
        {sale.payment_type === 'utang' && showCustomer && (
          <Badge variant="secondary">Utang: {customersById.get(sale.customer_id ?? '')?.name ?? '?'}</Badge>
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
      voided={payment.voided}
      amount={`−${formatPeso(payment.amount)}`}
      onVoid={canVoid(payment, member) ? () => onVoid(payment) : undefined}
      voidInfo={payment.voided ? payment.void_reason : null}
    >
      <div className={cn('text-lg font-semibold text-emerald-700', payment.voided && 'line-through')}>
        Bayad
      </div>
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
