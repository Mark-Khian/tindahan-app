import { describe, expect, it } from 'vitest'
import { looksLikeMultipleItems } from './multipleItems'

describe('looksLikeMultipleItems', () => {
  it('detects several quantity tokens or comma-separated items', () => {
    expect(looksLikeMultipleItems('1 kopiko 2 birch tree 1oil 3 laurel')).toBe(true)
    expect(looksLikeMultipleItems('1 ice gem, 1 inipit')).toBe(true)
    expect(looksLikeMultipleItems('1 lava, 1 toasted, 1 shampoo')).toBe(true)
    expect(looksLikeMultipleItems('1 candy bakuna tig 5 1zonrox 1champion bar')).toBe(true)
  })

  it('allows a single item, including sizes and a trailing comma', () => {
    expect(looksLikeMultipleItems('Coke')).toBe(false)
    expect(looksLikeMultipleItems('Coke 1.5')).toBe(false)
    expect(looksLikeMultipleItems('555 sardines')).toBe(false)
    expect(looksLikeMultipleItems('Sky flakes choco')).toBe(false)
    expect(looksLikeMultipleItems('Argentina corn beef 150g')).toBe(false)
    expect(looksLikeMultipleItems('Coke kasalo,')).toBe(false)
  })
})
