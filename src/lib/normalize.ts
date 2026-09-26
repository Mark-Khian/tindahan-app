/** Lowercase, trim, and collapse internal whitespace. Used for item_key and name_key. */
export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}
