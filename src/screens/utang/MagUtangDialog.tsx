import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
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
import { formatBusinessDate } from '@/lib/businessDate'
import { computeSubtotal, formatPeso, sumPesos } from '@/lib/money'
import { normalizeKey } from '@/lib/normalize'

interface Props {
  open: boolean
  initialCustomerId: string | null
  onClose: () => void
  onSaved: (customerId: string) => void
}

export function MagUtangDialog({ open, initialCustomerId, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        {open && (
          <MagUtangForm initialCustomerId={initialCustomerId} onClose={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MagUtangForm({ initialCustomerId, onClose, onSaved }: Omit<Props, 'open'>) {
  const { member } = useAuth()
  const { customers, customersById, balances } = useData()
  const { isLate, blocked, entryDate, resolveTarget } = useEntryTarget()
  const { guardSave, dutyDialog } = useDutyGate()
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId)
  const [customerText, setCustomerText] = useState('')
  const [items, setItems] = useState<ItemInput[]>([])
  const [error, setError] = useState<string | null>(null)

  const customerNames = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.name),
    [customers],
  )
  const selected = customerId ? customersById.get(customerId) : undefined
  const typedKey = normalizeKey(customerText)
  const typedMatch = typedKey ? customers.find((c) => c.name_key === typedKey) : undefined

  const choice: CustomerChoice | null = selected
    ? { id: selected.id }
    : typedMatch
      ? { id: typedMatch.id }
      : typedKey
        ? { newName: customerText }
        : null

  const total = sumPesos(items.map((i) => computeSubtotal(i.qty, i.unit_price)))

  const saveAll = () => {
    if (!choice) return setError('Pumili o mag-type ng customer.')
    if (items.length === 0) return setError('Magdagdag ng kahit isang item.')
    const target = resolveTarget()
    if (!target) return setError('Naka-close na ang araw. Gumamit ng Late entry.')
    guardSave(() => onSaved(recordUtang(choice, items, member.id, target)))
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl">Mag-utang</DialogTitle>
      </DialogHeader>

      {isLate && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
          LATE ENTRY para sa {formatBusinessDate(entryDate)}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="utang-customer" className="text-base">Customer</Label>
        {selected ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
            <div>
              <div className="text-lg font-semibold">{selected.name}</div>
              <div className="text-sm text-muted-foreground">
                Utang: {formatPeso(balances.get(selected.id) ?? 0)}
              </div>
            </div>
            <Button variant="outline" className="h-10" onClick={() => setCustomerId(null)}>
              Palitan
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
              placeholder="I-type ang pangalan"
            />
            {typedKey && !typedMatch && (
              <p className="text-sm text-muted-foreground">
                Bagong customer: <span className="font-semibold">{customerText.trim()}</span>
              </p>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <ItemEntryForm
          saveLabel="Idagdag"
          disabled={blocked}
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
                aria-label="Alisin"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-xl">
        <span>Kabuuan</span>
        <span className="font-bold">{formatPeso(total)}</span>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {dutyDialog}

      <div className="flex gap-2">
        <Button variant="outline" className="h-14 flex-1 text-base" onClick={onClose}>
          Kanselahin
        </Button>
        <Button
          className="h-14 flex-[2] text-lg"
          onClick={saveAll}
          disabled={blocked || items.length === 0 || !choice}
        >
          I-save lahat ({items.length})
        </Button>
      </div>
    </div>
  )
}
