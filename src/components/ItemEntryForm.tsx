import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { useAuth } from '@/auth/authContext'
import type { ItemInput } from '@/data/writes'
import { useItemSuggestions } from '@/hooks/useItemSuggestions'
import { hideSuggestion, readHiddenSuggestions } from '@/lib/hiddenSuggestions'
import { computeSubtotal, formatPeso, parseNumber } from '@/lib/money'
import { looksLikeMultipleItems } from '@/lib/multipleItems'
import { normalizeKey } from '@/lib/normalize'

interface Props {
  /** Return false to keep the form filled (e.g. save was blocked). */
  onSave: (item: ItemInput) => boolean | void
  saveLabel?: string
  disabled?: boolean
  /** Focus Item on mount. Used after a save that had to wait for the duty dialog. */
  autoFocusItem?: boolean
  /** Reports the current Item / Qty / Price text. Sales does not use this. */
  onDraftChange?: (draft: { item: string; qty: string; price: string }) => void
}

export function ItemEntryForm({ onSave, saveLabel = 'Save', disabled, autoFocusItem, onDraftChange }: Props) {
  const { member } = useAuth()
  const allSuggestions = useItemSuggestions()
  const [hiddenKeys, setHiddenKeys] = useState(() => readHiddenSuggestions(member.id))
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [multiOpen, setMultiOpen] = useState(false)
  const itemRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const pendingItem = useRef<ItemInput | null>(null)
  const savingAnyway = useRef(false)
  const hidden = useMemo(() => new Set(hiddenKeys), [hiddenKeys])
  const suggestions = useMemo(
    () => allSuggestions.filter((option) => !hidden.has(normalizeKey(option))),
    [allSuggestions, hidden],
  )

  useEffect(() => {
    if (autoFocusItem) itemRef.current?.focus()
  }, [autoFocusItem])

  useEffect(() => {
    onDraftChange?.({ item: name, qty, price })
  }, [name, qty, price, onDraftChange])

  const qtyValue = parseNumber(qty)
  const priceValue = parseNumber(price)
  const subtotal =
    qtyValue !== null && priceValue !== null ? computeSubtotal(qtyValue, priceValue) : null

  const bumpQty = (delta: number) => {
    const next = Math.max(1, Math.round((qtyValue ?? 0) + delta))
    setQty(String(next))
  }

  const commit = (item: ItemInput) => {
    const saved = onSave(item)
    if (saved === false) return
    setName('')
    setQty('1')
    setPrice('')
    itemRef.current?.focus()
  }

  const hideItem = (suggestion: string) => {
    const next = hideSuggestion(member.id, normalizeKey(suggestion))
    if (next) setHiddenKeys(next)
  }

  // Enter anywhere submits: saves when complete, otherwise jumps to the first missing field.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled) return
    if (!name.trim()) return itemRef.current?.focus()
    if (qtyValue === null || qtyValue <= 0) return qtyRef.current?.focus()
    if (priceValue === null || priceValue < 0) return priceRef.current?.focus()

    const item = { item_name: name.trim(), qty: qtyValue, unit_price: priceValue }
    if (looksLikeMultipleItems(item.item_name)) {
      pendingItem.current = item
      setMultiOpen(true)
      return
    }
    commit(item)
  }

  const saveAnyway = () => {
    savingAnyway.current = true
    const item = pendingItem.current
    pendingItem.current = null
    setMultiOpen(false)
    if (item) commit(item)
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
          onHide={hideItem}
          placeholder="e.g. Coke"
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
              aria-label="Decrease"
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
              aria-label="Increase"
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price" className="text-base">Price (₱)</Label>
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
      <AlertDialog
        open={multiOpen}
        onOpenChange={(open) => {
          if (open) {
            savingAnyway.current = false
            return
          }
          setMultiOpen(false)
          if (savingAnyway.current) return
          pendingItem.current = null
          itemRef.current?.focus()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Looks like several items. Please enter one item at a time.</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Edit</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={saveAnyway}>
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
