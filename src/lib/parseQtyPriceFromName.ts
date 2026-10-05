import { looksLikeMultipleItems } from './multipleItems'

export interface ParsedQtyPrice {
  item: string
  qty: number
  unitPrice: number
}

/** Leading whole qty, item name, then "tig" or "@", then a price. */
const QTY_PRICE = /^\s*(\d+)\s*(.*?)\s*(?:tig|@)\s*(\d+(?:\.\d+)?)\s*$/i

/**
 * Pulls quantity and unit price out of an item name like "3 tinapay tig 7".
 * Null when the name is not that pattern, or it looks like several items.
 */
export function parseQtyPriceFromName(text: string): ParsedQtyPrice | null {
  if (looksLikeMultipleItems(text)) return null
  const match = QTY_PRICE.exec(text)
  if (!match) return null
  const qty = Number(match[1])
  const item = match[2].trim()
  const unitPrice = Number(match[3])
  if (!Number.isInteger(qty) || qty < 1) return null
  if (!(unitPrice > 0) || !item) return null
  return { item, qty, unitPrice }
}

/** What Save / Add item should do before the duty gate. Multi-item wins. */
export function itemEntryCheck(itemName: string, qty: number): 'multi' | 'suggest' | 'save' {
  if (looksLikeMultipleItems(itemName)) return 'multi'
  if (qty === 1 && parseQtyPriceFromName(itemName)) return 'suggest'
  return 'save'
}
