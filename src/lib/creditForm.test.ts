import { describe, expect, it } from 'vitest'
import { creditFormChecks, discardPrompt } from './creditForm'

const empty = { item: '', price: '', listedCount: 0 }

describe('credit form unsaved checks', () => {
  it('treats an empty form as nothing to save or discard', () => {
    expect(creditFormChecks(empty)).toEqual({ hasUnaddedEntry: false, discard: 'none' })
    expect(discardPrompt(empty)).toBeNull()
  })

  it('warns about fields that were not added', () => {
    const fields = { item: 'Coke', price: '20', listedCount: 0 }
    expect(creditFormChecks(fields)).toEqual({ hasUnaddedEntry: true, discard: 'draft' })
    expect(discardPrompt(fields)).toBe("You have an item that hasn't been saved. Discard it?")
  })

  it('warns about a list with no leftover fields', () => {
    const list = { item: '', price: '', listedCount: 2 }
    expect(creditFormChecks(list)).toEqual({ hasUnaddedEntry: false, discard: 'list' })
    expect(discardPrompt(list)).toBe('You have 2 unsaved items. Discard them?')
  })

  it('warns about both a list and a leftover entry', () => {
    const both = { item: 'Coke', price: '20', listedCount: 1 }
    expect(creditFormChecks(both)).toEqual({ hasUnaddedEntry: true, discard: 'list' })
    expect(discardPrompt(both)).toBe('You have 1 unsaved item. Discard it?')
  })

  it('treats a name or a price alone as unsaved field content', () => {
    expect(creditFormChecks({ item: 'Coke', price: '  ', listedCount: 0 }).discard).toBe('draft')
    expect(creditFormChecks({ item: '', price: '15', listedCount: 0 })).toEqual({
      hasUnaddedEntry: false,
      discard: 'draft',
    })
  })
})