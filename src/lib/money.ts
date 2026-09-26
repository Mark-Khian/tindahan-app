/** Money math is done in integer centavos to avoid floating point drift. */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function fromCentavos(centavos: number): number {
  return centavos / 100
}

export function computeSubtotal(qty: number, unitPrice: number): number {
  return fromCentavos(Math.round(qty * toCentavos(unitPrice)))
}

export function sumPesos(values: number[]): number {
  return fromCentavos(values.reduce((acc, v) => acc + toCentavos(v), 0))
}

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPeso(pesos: number): string {
  return pesoFormatter.format(pesos)
}

/** Parses user input like "12", "12.50", "1,000". Returns null when not a finite number. */
export function parseNumber(input: string): number | null {
  const cleaned = input.replace(/[,\s₱]/g, '')
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}
