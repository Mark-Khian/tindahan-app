import { describe, expect, it } from 'vitest'
import { itemEntryCheck, parseQtyPriceFromName } from './parseQtyPriceFromName'

describe('parseQtyPriceFromName', () => {
  it('reads a leading qty, the item, and a tig or @ price', () => {
    expect(parseQtyPriceFromName('3 tinapay tig 7')).toEqual({ item: 'tinapay', qty: 3, unitPrice: 7 })
    expect(parseQtyPriceFromName('3 candy tig 5')).toEqual({ item: 'candy', qty: 3, unitPrice: 5 })
    expect(parseQtyPriceFromName('2 coke @15.50')).toEqual({ item: 'coke', qty: 2, unitPrice: 15.5 })
    expect(parseQtyPriceFromName('3tinapay tig7')).toEqual({ item: 'tinapay', qty: 3, unitPrice: 7 })
    expect(parseQtyPriceFromName('3 Tinapay TIG 7')).toEqual({ item: 'Tinapay', qty: 3, unitPrice: 7 })
  })

  it('returns null without a tig or @ price, or when the item would be empty', () => {
    expect(parseQtyPriceFromName('3 tinapay')).toBeNull()
    expect(parseQtyPriceFromName('555 sardines')).toBeNull()
    expect(parseQtyPriceFromName('Coke 1.5')).toBeNull()
    expect(parseQtyPriceFromName('3 tig 7')).toBeNull()
  })

  it('returns null for qty below 1 or a price that is not above 0', () => {
    expect(parseQtyPriceFromName('0 tinapay tig 7')).toBeNull()
    expect(parseQtyPriceFromName('3 tinapay tig 0')).toBeNull()
    expect(parseQtyPriceFromName('3 tinapay tig 0.00')).toBeNull()
  })

  it('returns null when the name looks like several items', () => {
    expect(parseQtyPriceFromName('1 candy bakuna tig 5 1zonrox 1champion bar')).toBeNull()
  })
})

describe('item entry check order', () => {
  it('warns about several items before suggesting a qty and price', () => {
    expect(itemEntryCheck('1 candy bakuna tig 5 1zonrox 1champion bar', 1)).toBe('multi')
    expect(itemEntryCheck('3 tinapay tig 7', 1)).toBe('suggest')
  })

  it('does not suggest when Qty is not 1', () => {
    expect(parseQtyPriceFromName('3 tinapay tig 7')).not.toBeNull()
    expect(itemEntryCheck('3 tinapay tig 7', 2)).toBe('save')
    expect(itemEntryCheck('3 tinapay tig 7', 3)).toBe('save')
  })
})
