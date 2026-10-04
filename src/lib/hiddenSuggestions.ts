/** Hidden autocomplete item keys for one user on this phone. Storage failures show every suggestion. */

export function hiddenSuggestionsKey(uid: string): string {
  return `hiddenSuggestions:${uid}`
}

export function readHiddenSuggestions(uid: string): string[] {
  try {
    const raw = localStorage.getItem(hiddenSuggestionsKey(uid))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((key): key is string => typeof key === 'string')
  } catch {
    return []
  }
}

/** Returns the updated list, or null when storage could not be written. */
export function hideSuggestion(uid: string, itemKey: string): string[] | null {
  try {
    const current = readHiddenSuggestions(uid)
    if (current.includes(itemKey)) return current
    const next = [...current, itemKey]
    localStorage.setItem(hiddenSuggestionsKey(uid), JSON.stringify(next))
    return next
  } catch {
    return null
  }
}

export function restoreHiddenSuggestions(uid: string): boolean {
  try {
    localStorage.removeItem(hiddenSuggestionsKey(uid))
    return true
  } catch {
    return false
  }
}
