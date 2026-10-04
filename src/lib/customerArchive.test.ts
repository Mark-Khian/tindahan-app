import { describe, expect, it } from 'vitest'
import {
  autocompleteCustomerNames,
  canShowPaidUpDelete,
  creditCustomerSave,
  isArchivedCustomer,
  visibleCustomers,
} from './customerArchive'

const mama = { id: 'c1', name: 'Mama', name_key: 'mama', archived: false as boolean | undefined }
const archived = { id: 'c2', name: 'Pedro', name_key: 'pedro', archived: true as boolean | undefined }
const legacy: { id: string; name: string; name_key: string; archived?: boolean } = {
  id: 'c3',
  name: 'Ana',
  name_key: 'ana',
}

describe('archived customers', () => {
  it('hides archived customers from the list, search, and autocomplete', () => {
    const all = [mama, archived, legacy]
    expect(visibleCustomers(all).map((c) => c.id)).toEqual(['c1', 'c3'])
    expect(visibleCustomers(all, 'ped').map((c) => c.id)).toEqual([])
    expect(visibleCustomers(all, 'ana').map((c) => c.id)).toEqual(['c3'])
    expect(autocompleteCustomerNames(all)).toEqual(['Mama', 'Ana'])
  })

  it('treats a missing archived field as not archived', () => {
    expect(isArchivedCustomer(legacy)).toBe(false)
    expect(isArchivedCustomer({ archived: false })).toBe(false)
    expect(isArchivedCustomer(archived)).toBe(true)
    expect(visibleCustomers([legacy]).map((c) => c.id)).toEqual(['c3'])
  })

  it('reuses an archived customer and un-archives only when saving', () => {
    const customers = [archived]
    expect(
      creditCustomerSave({ saving: true, selectedId: null, typedName: 'Pedro', customers }),
    ).toEqual({ kind: 'unarchive', id: 'c2' })
    expect(
      creditCustomerSave({ saving: false, selectedId: null, typedName: 'Pedro', customers }),
    ).toEqual({ kind: 'none' })
  })

  it('shows Delete only for an admin when the balance is exactly zero', () => {
    expect(canShowPaidUpDelete('admin', 0)).toBe(true)
    expect(canShowPaidUpDelete('bantay', 0)).toBe(false)
    expect(canShowPaidUpDelete('admin', 10)).toBe(false)
    expect(canShowPaidUpDelete('admin', -1)).toBe(false)
  })
})