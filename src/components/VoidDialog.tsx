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
        <DialogTitle>I-void ang entry?</DialogTitle>
        <DialogDescription className="text-base">{description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="void-reason" className="text-base">Dahilan (kailangan)</Label>
        <Input
          id="void-reason"
          className="h-12 text-lg"
          placeholder="hal. mali ang presyo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-12" onClick={onClose}>
          Huwag na
        </Button>
        <Button type="submit" variant="destructive" className="h-12" disabled={!reason.trim()}>
          I-void
        </Button>
      </DialogFooter>
    </form>
  )
}
