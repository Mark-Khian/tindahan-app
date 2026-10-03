import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEntryTarget } from '@/app/entryMode'
import { useDutyGate } from '@/hooks/useDutyGate'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { recordPayment } from '@/data/writes'
import { validatePaymentAmount } from '@/lib/balance'
import { formatBusinessDate } from '@/lib/businessDate'
import { formatPeso, parseNumber } from '@/lib/money'

export function BayadDialog({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  return (
    <Dialog open={customerId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {customerId && <BayadForm key={customerId} customerId={customerId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function BayadForm({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { member } = useAuth()
  const { customersById, balances } = useData()
  const { isLate, blocked, entryDate, resolveTarget } = useEntryTarget()
  const { guardSave, dutyDialog } = useDutyGate()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const customer = customersById.get(customerId)
  const balance = balances.get(customerId) ?? 0
  const value = parseNumber(amount)

  const save = () => {
    const check = validatePaymentAmount(value ?? 0, balance)
    if (check === 'not_positive') return setError('Maglagay ng halagang higit sa ₱0.')
    if (check === 'exceeds_balance') return setError(`Hindi puwedeng lumampas sa utang (${formatPeso(balance)}).`)
    const target = resolveTarget()
    if (!target) return setError('Naka-close na ang araw. Gumamit ng Late entry.')
    const amountToSave = value!
    guardSave(() => {
      recordPayment(customerId, amountToSave, member.id, target)
      onClose()
    })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <DialogHeader>
        <DialogTitle>Bayad ni {customer?.name ?? '?'}</DialogTitle>
        <DialogDescription className="text-base">
          Utang ngayon: <span className="text-xl font-bold text-foreground">{formatPeso(balance)}</span>
        </DialogDescription>
      </DialogHeader>
      {isLate && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
          LATE ENTRY para sa {formatBusinessDate(entryDate)}
        </p>
      )}
      {blocked && (
        <p className="rounded-md bg-muted p-2 text-sm">
          Naka-close na ang araw. Pindutin ang "Late entry" sa Utang screen.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        className="h-12 text-base"
        onClick={() => {
          setAmount(balance.toFixed(2))
          setError(null)
        }}
        disabled={balance <= 0}
      >
        Bayaran lahat ({formatPeso(balance)})
      </Button>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bayad-amount" className="text-base">Halaga (₱)</Label>
        <Input
          id="bayad-amount"
          inputMode="decimal"
          className="h-12 text-lg"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError(null)
          }}
          autoFocus
        />
      </div>
      {error && <p className="text-destructive">{error}</p>}
      {dutyDialog}
      <DialogFooter>
        <Button type="button" variant="outline" className="h-12" onClick={onClose}>
          Kanselahin
        </Button>
        <Button type="submit" className="h-12" disabled={blocked}>
          I-save ang bayad
        </Button>
      </DialogFooter>
    </form>
  )
}
