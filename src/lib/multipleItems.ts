/**
 * True when the text looks like more than one item: two comma-separated pieces,
 * or two quantity-like tokens such as "1 kopiko", "2 birch", or "1oil".
 */
export function looksLikeMultipleItems(text: string): boolean {
  const segments = text.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  if (segments.length >= 2) return true
  return quantityTokenCount(text) >= 2
}

/** A number at the start of a word, followed by letters immediately ("1oil") or after a space ("1 kopiko"). */
function quantityTokenCount(text: string): number {
  const words = text.split(/[\s,]+/).filter((word) => word.length > 0)
  let count = 0
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (/^\d+\p{L}/u.test(word)) {
      count++
      continue
    }
    const next = words[i + 1]
    if (/^\d+$/.test(word) && next !== undefined && /^\p{L}/u.test(next)) count++
  }
  return count
}
