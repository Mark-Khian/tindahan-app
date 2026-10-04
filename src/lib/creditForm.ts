/** Pure checks for the Add credit form. No saving happens here. */

export interface CreditFormSnapshot {
  item: string
  price: string
  listedCount: number
}

export interface CreditFormChecks {
  /** Item and price are filled, but the line was not added to the list. */
  hasUnaddedEntry: boolean
  /** What to ask before closing. `none` when there is nothing to discard. */
  discard: 'none' | 'draft' | 'list'
}

export function creditFormChecks(snapshot: CreditFormSnapshot): CreditFormChecks {
  const item = snapshot.item.trim()
  const price = snapshot.price.trim()
  const hasUnaddedEntry = item.length > 0 && price.length > 0
  const hasFieldContent = item.length > 0 || price.length > 0
  const discard = snapshot.listedCount > 0 ? 'list' : hasFieldContent ? 'draft' : 'none'
  return { hasUnaddedEntry, discard }
}

export function discardPrompt(snapshot: CreditFormSnapshot): string | null {
  const { discard } = creditFormChecks(snapshot)
  if (discard === 'list') {
    const n = snapshot.listedCount
    const noun = n === 1 ? 'item' : 'items'
    const them = n === 1 ? 'it' : 'them'
    return `You have ${n} unsaved ${noun}. Discard ${them}?`
  }
  if (discard === 'draft') return "You have an item that hasn't been saved. Discard it?"
  return null
}
