import { describe, expect, it } from 'vitest'
import type { Timestamp } from 'firebase/firestore'
import { activeEntries, deletedEntries } from './entries'
import type { Payment, Sale } from './types'

const ts = (ms: number) => ({ toMillis: () => ms }) as Timestamp

const sale = (id: string, voidedAtMs: number | null = null): Sale =>
  ({ id, voided: voidedAtMs !== null, voided_at: voidedAtMs === null ? null : ts(voidedAtMs) }) as Sale

const payment = (id: string, voidedAtMs: number | null = null): Payment =>
  ({ id, voided: voidedAtMs !== null, voided_at: voidedAtMs === null ? null : ts(voidedAtMs) }) as Payment

describe('activeEntries', () => {
  it('drops voided entries and keeps order', () => {
    const list = [sale('a'), sale('b', 5), sale('c')]
    expect(activeEntries(list).map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('returns an empty list when everything is voided', () => {
    expect(activeEntries([payment('x', 1), payment('y', 2)])).toEqual([])
  })
})

describe('deletedEntries', () => {
  it('returns only voided sales and payments', () => {
    const result = deletedEntries([sale('s1'), sale('s2', 10)], [payment('p1', 20), payment('p2')])
    expect(result.map((d) => `${d.kind}:${d.entry.id}`)).toEqual(['payment:p1', 'sale:s2'])
  })

  it('sorts most recently voided first, with a missing voided_at on top', () => {
    const noTime = { ...sale('s3', 0), voided_at: null }
    const result = deletedEntries([sale('s1', 10), noTime], [payment('p1', 30), payment('p2', 20)])
    expect(result.map((d) => d.entry.id)).toEqual(['s3', 'p1', 'p2', 's1'])
  })

  it('returns an empty list when nothing is voided', () => {
    expect(deletedEntries([sale('s1')], [payment('p1')])).toEqual([])
  })
})
