import { describe, expect, it } from 'vitest'
import { readThemeChoice, resolveTheme, saveThemeChoice } from './theme'

describe('resolveTheme', () => {
  it('keeps Light', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('keeps Dark', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows a dark system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
  })

  it('follows a light system preference', () => {
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('readThemeChoice', () => {
  it('uses System when storage fails', () => {
    const storage = {
      getItem(): string | null {
        throw new Error('storage blocked')
      },
    }
    expect(readThemeChoice(storage)).toBe('system')
    expect(readThemeChoice(null)).toBe('system')
  })

  it('uses System when a save fails', () => {
    const storage = {
      setItem(): void {
        throw new Error('storage blocked')
      },
    }
    expect(saveThemeChoice(storage, 'dark')).toBe('system')
  })
})
