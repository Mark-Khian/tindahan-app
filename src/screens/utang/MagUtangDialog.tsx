import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { ItemEntryForm } from '@/components/ItemEntryForm'
import { useEntryTarget } from '@/app/entryMode'
import { useDutyGate } from '@/hooks/useDutyGate'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { recordUtang, type CustomerChoice, type ItemInput } from '@/data/writes'
import { creditCustomerHint } from '@/lib/creditCustomer'
import { autocompleteCustomerNames, creditCustomerSave } from '@/lib/customerArchive'
import { creditFormChecks, discardPrompt, type CreditFormSnapshot } from '@/lib/creditForm'
import { formatBusinessDate } from '@/lib/businessDate'
import { computeSubtotal, formatPeso, parseNumber, sumPesos } from '@/lib/money'
import { normalizeKey } from '@/lib/normalize'

interface Props {
  open: boolean
  initialCustomerId: string | null
  onClose: () => void
  onSaved: (customerId: string) => void
}

interface Draft {
  item: string
  qty: string
  price: string
}

const emptyDraft: Draft = { item: '', qty: '1', price: '' }

export function MagUtangDialog({ open, initialCustomerId, onClose, onSaved }: Props) {
  const [activity, setActivity] = useState<CreditFormSnapshot>({ item: '', price: '', listedCount: 0 })
  const [discardOpen, setDiscardOpen] = useState(false)

  const finishClose = () => {
    setActivity({ item: '', price: '', listedCount: 0 })
    setDiscardOpen(false)
    onClose()
  }

  const requestClose = () => {
    if (discardPrompt(activity)) setDiscardOpen(true)
    else finishClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        {open && (
          <MagUtangForm
            initialCustomerId={initialCustomerId}
            onActivity={setActivity}
            onClose={requestClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
      <AlertDialog open={discardOpen} onOpenChange={(next) => !next && setDiscardOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{discardPrompt(activity)}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-12"
              onClick={finishClose}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

function MagUtangForm({
  initialCustomerId,
  onActivity,
  onClose,
  onSaved,
}: Omit<Props, 'open'> & { onActivity: (snapshot: CreditFormSnapshot) => void }) {
  const { member } = useAuth()
  const { customers, customersById, balances } = useData()
  const { isLate, blocked, entryDate, resolveTarget } = useEntryTarget()
  const { guardSave, dutyDialog } = useDutyGate()
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId)
  const [customerText, setCustomerText] = useState('')
  const [items, setItems] = useState<ItemInput[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [entryKey, setEntryKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [unaddedOpen, setUnaddedOpen] = useState(false)

  const customerNames = autocompleteCustomerNames(customers).sort((a, b) => a.localeCompare(b))
  const selected = customerId ? customersById.get(customerId) : undefined
  const hint = selected ? null : creditCustomerHint(customerText, customers)
  const customerSave = creditCustomerSave({
    saving: true,
    selectedId: customerId,
    typedName: customerText,
    customers,
  })
  const choice: CustomerChoice | null =
    customerSave.kind === 'create'
      ? { newName: customerSave.name }
      : customerSave.kind === 'reuse' || customerSave.kind === 'unarchive'
        ? { id: customerSave.id, unarchive: customerSave.kind === 'unarchive' }
        : null

  const snapshot: CreditFormSnapshot = { item: draft.item, price: draft.price, listedCount: items.length }
  const { hasUnaddedEntry } = creditFormChecks(snapshot)

  useEffect(() => {
    onActivity({ item: draft.item, price: draft.price, listedCount: items.length })
  }, [draft.item, draft.price, items.length, onActivity])
  const total = sumPesos(items.map((i) => computeSubtotal(i.qty, i.unit_price)))
  const draftPrice = parseNumber(draft.price)
  const unaddedLabel =
    draftPrice !== null ? formatPeso(draftPrice) : `₱${draft.price.trim()}`

  const performSave = (lines: ItemInput[]) => {
    if (!choice) return setError('Choose or type a customer.')
    if (lines.length === 0) return setError('Add at least one item.')
    const target = resolveTarget()
    if (!target) return setError('This day is already closed. Use Late entry.')
    guardSave(() => onSaved(recordUtang(choice, lines, member.id, target)))
  }

  const draftLine = (): ItemInput | null => {
    const qty = parseNumber(draft.qty)
    const price = parseNumber(draft.price)
    if (!draft.item.trim() || qty === null || qty <= 0 || price === null || price < 0) return null
    return { item_name: draft.item.trim(), qty, unit_price: price }
  }

  const saveAll = () => {
    setError(null)
    if (hasUnaddedEntry) {
      setUnaddedOpen(true)
      return
    }
    performSave(items)
  }

  const addAndSave = () => {
    const line = draftLine()
    if (!line) {
      setUnaddedOpen(false)
      setError('Enter a valid quantity and price.')
      return
    }
    const next = [...items, line]
    setItems(next)
    setEntryKey((key) => key + 1)
    setDraft(emptyDraft)
    setUnaddedOpen(false)
    performSave(next)
  }

  const saveWithout = () => {
    setUnaddedOpen(false)
    performSave(items)
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl">Add credit</DialogTitle>
      </DialogHeader>

      {isLate && (
        <p className="rounded-md border border-amber-400 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          LATE ENTRY for {formatBusinessDate(entryDate)}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="utang-customer" className="text-base">Customer</Label>
        {selected ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
            <div>
              <div className="text-lg font-semibold">{selected.name}</div>
              <div className="text-sm text-muted-foreground">
                Balance: {formatPeso(balances.get(selected.id) ?? 0)}
              </div>
            </div>
            <Button variant="outline" className="h-10" onClick={() => setCustomerId(null)}>
              Change
            </Button>
          </div>
        ) : (
          <>
            <AutocompleteInput
              id="utang-customer"
              value={customerText}
              onValueChange={(v) => {
                setCustomerText(v)
                setError(null)
              }}
              options={customerNames}
              onPick={(name) => {
                const match = customers.find((c) => c.name_key === normalizeKey(name))
                if (match) setCustomerId(match.id)
              }}
              placeholder="Type a name"
            />
            {hint && (
              <p className="text-sm text-muted-foreground">
                {hint.kind === 'existing' ? 'Existing customer' : 'New customer'}:{' '}
                <span className="font-semibold">{hint.name}</span>
              </p>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <ItemEntryForm
          key={entryKey}
          saveLabel="Add item"
          disabled={blocked}
          onDraftChange={setDraft}
          onSave={(item) => {
            setItems((prev) => [...prev, item])
            setError(null)
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="rounded-lg border">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 border-b p-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-semibold break-words">{item.item_name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.qty} × {formatPeso(item.unit_price)}
                </div>
              </div>
              <span className="font-bold">{formatPeso(computeSubtotal(item.qty, item.unit_price))}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Remove"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-xl">
        <span>Total</span>
        <span className="font-bold">{formatPeso(total)}</span>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {dutyDialog}

      <div className="flex gap-2">
        <Button variant="outline" className="h-14 flex-1 text-base" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="h-14 flex-[2] text-lg"
          onClick={saveAll}
          disabled={blocked || !choice || (items.length === 0 && !hasUnaddedEntry)}
        >
          Save all ({items.length})
        </Button>
      </div>

      <AlertDialog open={unaddedOpen} onOpenChange={(next) => !next && setUnaddedOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              "{draft.item.trim()}" ({unaddedLabel}) hasn't been added yet.
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" className="h-12" onClick={() => setUnaddedOpen(false)}>
              Cancel
            </Button>
            {items.length > 0 && (
              <Button variant="outline" className="h-12" onClick={saveWithout}>
                Save without it
              </Button>
            )}
            <Button className="h-12" onClick={addAndSave}>
              Add & save
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
