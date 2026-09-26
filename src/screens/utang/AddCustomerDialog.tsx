import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { addCustomer } from '@/data/writes'
import { normalizeKey } from '@/lib/normalize'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with the new (or chosen existing) customer id. */
  onDone: (customerId: string) => void
}

export function AddCustomerDialog({ open, onClose, onDone }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{open && <AddCustomerForm onClose={onClose} onDone={onDone} />}</DialogContent>
    </Dialog>
  )
}

function AddCustomerForm({ onClose, onDone }: Omit<Props, 'open'>) {
  const { member } = useAuth()
  const { customers } = useData()
  const [name, setName] = useState('')
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)

  const key = normalizeKey(name)
  const duplicate = key ? customers.find((c) => c.name_key === key) : undefined

  const save = () => {
    if (!key) return
    if (duplicate && !confirmDuplicate) {
      setConfirmDuplicate(true)
      return
    }
    onDone(addCustomer(name, member.id))
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
        <DialogTitle>Bagong customer</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-name" className="text-base">Pangalan</Label>
        <Input
          id="customer-name"
          className="h-12 text-lg"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setConfirmDuplicate(false)
          }}
          autoFocus
          autoComplete="off"
        />
      </div>
      {duplicate && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-amber-900">
          <p className="font-semibold">⚠️ May customer na na "{duplicate.name}".</p>
          <p className="text-sm">Baka iisang tao lang sila.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-11 w-full"
            onClick={() => onDone(duplicate.id)}
          >
            Buksan si {duplicate.name}
          </Button>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" className="h-12" onClick={onClose}>
          Kanselahin
        </Button>
        <Button type="submit" className="h-12" disabled={!key}>
          {duplicate ? (confirmDuplicate ? 'Sigurado, idagdag pa rin' : 'Idagdag pa rin') : 'Idagdag'}
        </Button>
      </DialogFooter>
    </form>
  )
}
