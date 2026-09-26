import { describe, expect, it } from 'vitest'
import { computeSubtotal, parseNumber, sumPesos } from './money'

describe('computeSubtotal', () => {
  it('multiplies without floating point drift', () => {
    expect(computeSubtotal(3, 0.1)).toBe(0.3)
    expect(computeSubtotal(2, 12.5)).toBe(25)
    expect(computeSubtotal(0.5, 45)).toBe(22.5)
  })
})

describe('sumPesos', () => {
  it('sums in centavos', () => {
    expect(sumPesos([0.1, 0.2])).toBe(0.3)
    expect(sumPesos([])).toBe(0)
  })
})

describe('parseNumber', () => {
  it('parses plain and formatted numbers', () => {
    expect(parseNumber('12')).toBe(12)
    expect(parseNumber('12.50')).toBe(12.5)
    expect(parseNumber('1,000')).toBe(1000)
    expect(parseNumber('₱ 20')).toBe(20)
    expect(parseNumber('.5')).toBe(0.5)
  })

  it('rejects invalid input', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('.')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('-5')).toBeNull()
    expect(parseNumber('1.2.3')).toBeNull()
  })
})
