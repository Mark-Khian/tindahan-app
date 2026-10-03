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
import { useAuth } from '@/auth/authContext'
import { voidEntry, type VoidTarget } from '@/data/writes'
import { formatPeso } from '@/lib/money'

export function VoidDialog({ target, onClose }: { target: VoidTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* Keyed so the reason field resets for each entry. */}
        {target && <VoidForm key={target.entry.id} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function VoidForm({ target, onClose }: { target: VoidTarget; onClose: () => void }) {
  const { member } = useAuth()
  const [reason, setReason] = useState('')

  const description =
    target.kind === 'sales'
      ? `${target.entry.item_name} · ${target.entry.qty} × ${formatPeso(target.entry.unit_price)} = ${formatPeso(target.entry.subtotal)}`
      : `Bayad ${formatPeso(target.entry.amount)}`

  const confirm = () => {
    if (!reason.trim()) return
    voidEntry(target, reason, member.id)
    onClose()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        confirm()
      }}
    >
      <DialogHeader>
        <DialogTitle>Delete this sale?</DialogTitle>
        <DialogDescription className="text-base">{description}</DialogDescription>
      </DialogHeader>
      {target.kind === 'sales' && (
        <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          Only for wrong entries (typo, duplicate, or cancelled). If a customer paid their credit, use Pay on the
          Credit tab.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="void-reason" className="text-base">Reason (required)</Label>
        <Input
          id="void-reason"
          className="h-12 text-lg"
          placeholder="e.g. wrong price"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-12" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" className="h-12" disabled={!reason.trim()}>
          Delete
        </Button>
      </DialogFooter>
    </form>
  )
}
