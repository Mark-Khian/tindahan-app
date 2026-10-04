import { describe, expect, it } from 'vitest'
import { creditCustomerHint, planCreditCustomer, type CreditCustomer } from './creditCustomer'

const customers: CreditCustomer[] = [
  { id: 'c1', name: 'Mama', name_key: 'mama' },
  { id: 'c2', name: 'Louise', name_key: 'louise' },
]

describe('planCreditCustomer', () => {
  it('reuses the existing customer when the typed name matches name_key', () => {
    expect(
      planCreditCustomer({
        saving: true,
        selectedId: null,
        typedName: '  MAMA  ',
        customers,
      }),
    ).toEqual({ action: 'reuse', id: 'c1', name: 'Mama' })
    expect(creditCustomerHint('mama', customers)).toEqual({ kind: 'existing', name: 'Mama' })
  })

  it('creates a new customer only when save runs and there is no match', () => {
    expect(
      planCreditCustomer({
        saving: true,
        selectedId: null,
        typedName: 'Pedro',
        customers,
      }),
    ).toEqual({ action: 'create', name: 'Pedro' })
    expect(creditCustomerHint('Pedro', customers)).toEqual({ kind: 'new', name: 'Pedro' })
  })

  it('creates nothing when the user cancels or closes', () => {
    expect(
      planCreditCustomer({
        saving: false,
        selectedId: null,
        typedName: 'Pedro',
        customers,
      }),
    ).toEqual({ action: 'none' })
    expect(
      planCreditCustomer({
        saving: false,
        selectedId: null,
        typedName: 'Mama',
        customers,
      }),
    ).toEqual({ action: 'none' })
  })
})