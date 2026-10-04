import { useState, type ReactNode } from 'react'
import { CloudUpload, MoreHorizontal } from 'lucide-react'
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
  menu = false,
}: {
  children: ReactNode
  amount: string
  onVoid?: () => void
  /** Credit history uses a ⋯ menu. Sales keeps the Delete button. */
  menu?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-lg font-bold">{amount}</span>
        {onVoid && menu && (
          <div className="relative">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="More options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="size-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute top-10 right-0 z-40 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                  <button
                    type="button"
                    className="flex h-11 w-full items-center rounded-md px-3 text-left font-medium text-destructive"
                    onClick={() => {
                      setMenuOpen(false)
                      onVoid()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {onVoid && !menu && (
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
  menu = false,
}: {
  sale: Sale
  onVoid: (sale: Sale) => void
  showCustomer?: boolean
  showDate?: boolean
  menu?: boolean
}) {
  const { member } = useAuth()
  const { memberNames, customersById } = useData()
  const when = sale.recorded_at?.toDate()
  return (
    <RowShell
      amount={formatPeso(sale.subtotal)}
      menu={menu}
      onVoid={canVoid(sale, member) ? () => onVoid(sale) : undefined}
    >
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
  menu = false,
}: {
  payment: Payment
  onVoid: (payment: Payment) => void
  showDate?: boolean
  menu?: boolean
}) {
  const { member } = useAuth()
  const { memberNames } = useData()
  const when = payment.received_at?.toDate()
  return (
    <RowShell
      amount={`−${formatPeso(payment.amount)}`}
      menu={menu}
      onVoid={canVoid(payment, member) ? () => onVoid(payment) : undefined}
    >
      <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Payment</div>
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
