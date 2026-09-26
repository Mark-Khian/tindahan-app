import { useRef, useState, type FormEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import type { ItemInput } from '@/data/writes'
import { useItemSuggestions } from '@/hooks/useItemSuggestions'
import { computeSubtotal, formatPeso, parseNumber } from '@/lib/money'

interface Props {
  /** Return false to keep the form filled (e.g. save was blocked). */
  onSave: (item: ItemInput) => boolean | void
  saveLabel?: string
  disabled?: boolean
}

export function ItemEntryForm({ onSave, saveLabel = 'Save', disabled }: Props) {
  const suggestions = useItemSuggestions()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const itemRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  const qtyValue = parseNumber(qty)
  const priceValue = parseNumber(price)
  const subtotal =
    qtyValue !== null && priceValue !== null ? computeSubtotal(qtyValue, priceValue) : null

  const bumpQty = (delta: number) => {
    const next = Math.max(1, Math.round((qtyValue ?? 0) + delta))
    setQty(String(next))
  }

  // Enter anywhere submits: saves when complete, otherwise jumps to the first missing field.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled) return
    if (!name.trim()) return itemRef.current?.focus()
    if (qtyValue === null || qtyValue <= 0) return qtyRef.current?.focus()
    if (priceValue === null || priceValue < 0) return priceRef.current?.focus()

    const saved = onSave({ item_name: name.trim(), qty: qtyValue, unit_price: priceValue })
    if (saved === false) return
    setName('')
    setQty('1')
    setPrice('')
    itemRef.current?.focus()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item" className="text-base">Item</Label>
        <AutocompleteInput
          id="item"
          ref={itemRef}
          value={name}
          onValueChange={setName}
          options={suggestions}
          onPick={() => priceRef.current?.focus()}
          placeholder="Paninda"
          enterKeyHint="next"
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qty" className="text-base">Qty</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0"
              onClick={() => bumpQty(-1)}
              disabled={disabled}
              aria-label="Bawasan"
            >
              <Minus />
            </Button>
            <Input
              id="qty"
              ref={qtyRef}
              inputMode="numeric"
              className="h-12 w-12 shrink-0 px-1 text-center text-lg"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0"
              onClick={() => bumpQty(1)}
              disabled={disabled}
              aria-label="Dagdagan"
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price" className="text-base">Presyo (₱)</Label>
          <Input
            id="price"
            ref={priceRef}
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="0.00"
            className="h-12 text-lg"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg">
          Subtotal: <span className="font-bold">{subtotal !== null ? formatPeso(subtotal) : '—'}</span>
        </div>
        <Button type="submit" className="h-14 min-w-32 text-lg" disabled={disabled}>
          {saveLabel}
        </Button>
      </div>
    </form>
  )
}
