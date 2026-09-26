import { describe, expect, it } from 'vitest'
import { normalizeKey } from './normalize'

describe('normalizeKey', () => {
  it('lowercases and trims', () => {
    expect(normalizeKey('  Coke Mismo  ')).toBe('coke mismo')
  })

  it('collapses internal whitespace, tabs and newlines', () => {
    expect(normalizeKey('Lucky   Me\tPancit\nCanton')).toBe('lucky me pancit canton')
  })

  it('treats differently-typed names as the same key', () => {
    expect(normalizeKey('SAFEGUARD  white')).toBe(normalizeKey(' safeguard White'))
  })

  it('keeps accented letters and symbols', () => {
    expect(normalizeKey('Piña  Juice 1L')).toBe('piña juice 1l')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeKey('   ')).toBe('')
  })
})
