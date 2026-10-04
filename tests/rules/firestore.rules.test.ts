import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

const DATE = '2026-09-26'
let env: RulesTestEnvironment

// Uids: admin (role admin), ana + ben (bantay), zed (signed in, not a member).
const db = (uid: string | null): Firestore =>
  (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore()) as unknown as Firestore

function sale(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    item_name: 'Coke Mismo',
    item_key: 'coke mismo',
    qty: 2,
    unit_price: 20,
    subtotal: 40,
    payment_type: 'cash',
    customer_id: null,
    batch_id: null,
    recorded_by: uid,
    recorded_at: Timestamp.now(),
    server_created_at: serverTimestamp(),
    business_date: DATE,
    is_late_entry: false,
    voided: false,
    void_reason: null,
    voided_by: null,
    voided_at: null,
    ...overrides,
  }
}

function payment(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    customer_id: 'cust1',
    amount: 50,
    received_by: uid,
    received_at: Timestamp.now(),
    server_created_at: serverTimestamp(),
    business_date: DATE,
    is_late_entry: false,
    voided: false,
    void_reason: null,
    voided_by: null,
    voided_at: null,
    ...overrides,
  }
}

const totals = {
  gross: 0,
  cash_sales: 0,
  utang_sales: 0,
  utang_payments: 0,
  expected_cash: 0,
  per_member: {},
}

function voidPatch(uid: string, reason = 'mali ang presyo') {
  return { voided: true, void_reason: reason, voided_by: uid, voided_at: serverTimestamp() }
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data)
  })
}

async function seedSale(id: string, uid: string, overrides: Record<string, unknown> = {}) {
  await seed(`sales/${id}`, { ...sale(uid, overrides), server_created_at: Timestamp.now() })
}

async function seedPayment(id: string, uid: string) {
  await seed(`payments/${id}`, { ...payment(uid), server_created_at: Timestamp.now() })
}

async function seedClosure(date: string, closedAt: Timestamp) {
  await seed(`day_closures/${date}`, { closed_by: 'admin', closed_at: closedAt, totals })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tindahan',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await seed('members/admin', { name: 'Admin', role: 'admin', last_sync_at: null })
  await seed('members/ana', { name: 'Ana', role: 'bantay', last_sync_at: null })
  await seed('members/ben', { name: 'Ben', role: 'bantay', last_sync_at: null })
})

describe('reads', () => {
  it('members can read every collection', async () => {
    await seedSale('s1', 'ana')
    await assertSucceeds(getDoc(doc(db('ben'), 'sales/s1')))
    await assertSucceeds(getDoc(doc(db('ben'), 'members/ana')))
    await assertSucceeds(getDoc(doc(db('ben'), 'audit_log/x')))
  })

  it('signed-out users and non-members cannot read', async () => {
    await seedSale('s1', 'ana')
    await assertFails(getDoc(doc(db(null), 'sales/s1')))
    await assertFails(getDoc(doc(db('zed'), 'sales/s1')))
    await assertFails(getDoc(doc(db('zed'), 'members/zed')))
  })
})

describe('members', () => {
  it('a member may update only their own last_sync_at', async () => {
    await assertSucceeds(updateDoc(doc(db('ana'), 'members/ana'), { last_sync_at: serverTimestamp() }))
    await assertFails(updateDoc(doc(db('ana'), 'members/ana'), { role: 'admin' }))
    await assertFails(
      updateDoc(doc(db('ana'), 'members/ana'), { last_sync_at: serverTimestamp(), name: 'X' }),
    )
    await assertFails(updateDoc(doc(db('ana'), 'members/ben'), { last_sync_at: serverTimestamp() }))
    await assertFails(updateDoc(doc(db('ana'), 'members/ana'), { last_sync_at: Timestamp.now() }))
  })

  it('only admins can create or edit members', async () => {
    await assertFails(setDoc(doc(db('ana'), 'members/new'), { name: 'New', role: 'bantay' }))
    await assertSucceeds(setDoc(doc(db('admin'), 'members/new'), { name: 'New', role: 'bantay' }))
    await assertSucceeds(updateDoc(doc(db('admin'), 'members/ana'), { name: 'Ana B.' }))
  })

  it('non-members cannot create themselves', async () => {
    await assertFails(setDoc(doc(db('zed'), 'members/zed'), { name: 'Zed', role: 'admin' }))
  })
})

describe('sales create', () => {
  it('accepts a valid cash sale', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s1'), sale('ana')))
  })

  it('accepts a valid utang sale', async () => {
    await assertSucceeds(
      setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { payment_type: 'utang', customer_id: 'c1', batch_id: 'b1' })),
    )
  })

  it('rejects non-members', async () => {
    await assertFails(setDoc(doc(db('zed'), 'sales/s1'), sale('zed')))
  })

  it('requires recorded_by == auth uid', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ben')))
  })

  it('requires qty > 0 and unit_price >= 0', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { qty: 0 })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { qty: -1 })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { unit_price: -0.01 })))
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s2'), sale('ana', { unit_price: 0, subtotal: 0 })))
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s3'), sale('ana', { qty: 0.5, subtotal: 10 })))
  })

  it('checks field types', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { qty: '2' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { item_name: '' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { payment_type: 'gcash' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { business_date: '26/09/2026' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { recorded_at: 'now' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { is_late_entry: 'no' })))
  })

  it('requires customer_id only for utang', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { customer_id: 'c1' })))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { payment_type: 'utang' })))
  })

  it('rejects missing or extra fields', async () => {
    const missing: Record<string, unknown> = sale('ana')
    delete missing.item_key
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), missing))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { balance: 100 })))
  })

  it('rejects entries created already voided', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { voided: true })))
  })

  it('requires server_created_at to be the server timestamp', async () => {
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { server_created_at: Timestamp.now() })))
  })
})

describe('closed business dates', () => {
  it('blocks normal entries recorded after the closure', async () => {
    await seedClosure(DATE, Timestamp.fromMillis(Date.now() - 60_000))
    await assertFails(setDoc(doc(db('ana'), 'sales/s1'), sale('ana')))
    await assertFails(setDoc(doc(db('ana'), 'payments/p1'), payment('ana')))
  })

  it('allows explicit late entries', async () => {
    await seedClosure(DATE, Timestamp.fromMillis(Date.now() - 60_000))
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { is_late_entry: true })))
    await assertSucceeds(setDoc(doc(db('ana'), 'payments/p1'), payment('ana', { is_late_entry: true })))
  })

  it('allows offline entries recorded before the closure to sync', async () => {
    await seedClosure(DATE, Timestamp.now())
    const before = Timestamp.fromMillis(Date.now() - 60 * 60_000)
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s1'), sale('ana', { recorded_at: before })))
    await assertSucceeds(setDoc(doc(db('ana'), 'payments/p1'), payment('ana', { received_at: before })))
  })

  it('does not affect other dates', async () => {
    await seedClosure('2026-09-25', Timestamp.now())
    await assertSucceeds(setDoc(doc(db('ana'), 'sales/s1'), sale('ana')))
  })
})

describe('sales update (void)', () => {
  beforeEach(async () => {
    await seedSale('s1', 'ana')
  })

  it('the recorder can void with a reason', async () => {
    await assertSucceeds(updateDoc(doc(db('ana'), 'sales/s1'), voidPatch('ana')))
  })

  it('an admin can void anyone’s entry', async () => {
    await assertSucceeds(updateDoc(doc(db('admin'), 'sales/s1'), voidPatch('admin')))
  })

  it('another bantay cannot void', async () => {
    await assertFails(updateDoc(doc(db('ben'), 'sales/s1'), voidPatch('ben')))
  })

  it('requires a reason and correct voided_by / voided_at', async () => {
    await assertFails(updateDoc(doc(db('ana'), 'sales/s1'), voidPatch('ana', '')))
    await assertFails(updateDoc(doc(db('ana'), 'sales/s1'), voidPatch('ben')))
    await assertFails(
      updateDoc(doc(db('ana'), 'sales/s1'), { ...voidPatch('ana'), voided_at: Timestamp.now() }),
    )
  })

  it('cannot change any non-void field', async () => {
    await assertFails(updateDoc(doc(db('ana'), 'sales/s1'), { qty: 5 }))
    await assertFails(updateDoc(doc(db('ana'), 'sales/s1'), { ...voidPatch('ana'), subtotal: 0 }))
  })

  it('cannot un-void or re-void', async () => {
    await seedSale('s2', 'ana', {
      voided: true,
      void_reason: 'x',
      voided_by: 'ana',
      voided_at: Timestamp.now(),
    })
    await assertFails(
      updateDoc(doc(db('ana'), 'sales/s2'), { voided: false, void_reason: null, voided_by: null, voided_at: null }),
    )
    await assertFails(updateDoc(doc(db('admin'), 'sales/s2'), voidPatch('admin', 'again')))
  })
})

describe('payments', () => {
  it('accepts a valid payment', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'payments/p1'), payment('ana')))
  })

  it('requires amount > 0 and received_by == auth uid', async () => {
    await assertFails(setDoc(doc(db('ana'), 'payments/p1'), payment('ana', { amount: 0 })))
    await assertFails(setDoc(doc(db('ana'), 'payments/p1'), payment('ana', { amount: -5 })))
    await assertFails(setDoc(doc(db('ana'), 'payments/p1'), payment('ben')))
  })

  it('void rules match sales', async () => {
    await seedPayment('p1', 'ana')
    await assertFails(updateDoc(doc(db('ben'), 'payments/p1'), voidPatch('ben')))
    await assertFails(updateDoc(doc(db('ana'), 'payments/p1'), { amount: 1 }))
    await assertSucceeds(updateDoc(doc(db('ana'), 'payments/p1'), voidPatch('ana')))
  })
})

describe('customers', () => {
  const customer = (uid: string) => ({
    name: 'Juan Dela Cruz',
    name_key: 'juan dela cruz',
    created_by: uid,
    created_at: serverTimestamp(),
  })

  it('members can create customers as themselves', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'customers/c1'), customer('ana')))
    await assertFails(setDoc(doc(db('ana'), 'customers/c2'), customer('ben')))
    await assertFails(setDoc(doc(db('zed'), 'customers/c3'), customer('zed')))
  })

  it('only admins can rename', async () => {
    await seed('customers/c1', { ...customer('ana'), created_at: Timestamp.now() })
    await assertFails(updateDoc(doc(db('ana'), 'customers/c1'), { name: 'Juan', name_key: 'juan' }))
    await assertSucceeds(updateDoc(doc(db('admin'), 'customers/c1'), { name: 'Juan', name_key: 'juan' }))
    await assertFails(updateDoc(doc(db('admin'), 'customers/c1'), { created_by: 'admin' }))
  })

  const archivePatch = (uid: string) => ({
    archived: true,
    archived_by: uid,
    archived_at: serverTimestamp(),
  })

  it('an admin can archive a customer that has no archived field', async () => {
    await seed('customers/c1', { ...customer('ana'), created_at: Timestamp.now() })
    await assertSucceeds(updateDoc(doc(db('admin'), 'customers/c1'), archivePatch('admin')))
  })

  it('a non-admin cannot archive', async () => {
    await seed('customers/c1', { ...customer('ana'), created_at: Timestamp.now() })
    await assertFails(updateDoc(doc(db('ana'), 'customers/c1'), archivePatch('ana')))
  })

  it('an archive that also changes another field is denied', async () => {
    await seed('customers/c1', { ...customer('ana'), created_at: Timestamp.now() })
    await assertFails(
      updateDoc(doc(db('admin'), 'customers/c1'), { ...archivePatch('admin'), name: 'Other' }),
    )
    await assertFails(
      updateDoc(doc(db('admin'), 'customers/c1'), { ...archivePatch('admin'), created_by: 'admin' }),
    )
  })

  it('a member can un-archive, but cannot archive', async () => {
    await seed('customers/c1', {
      ...customer('ana'),
      created_at: Timestamp.now(),
      archived: true,
      archived_by: 'admin',
      archived_at: Timestamp.now(),
    })
    await assertSucceeds(updateDoc(doc(db('ana'), 'customers/c1'), { archived: false }))

    await seed('customers/c2', { ...customer('ana'), created_at: Timestamp.now(), archived: false })
    await assertFails(updateDoc(doc(db('ana'), 'customers/c2'), archivePatch('ana')))
  })

  it('deleting a customer is denied', async () => {
    await seed('customers/c1', { ...customer('ana'), created_at: Timestamp.now() })
    await assertFails(deleteDoc(doc(db('admin'), 'customers/c1')))
    await assertFails(deleteDoc(doc(db('ana'), 'customers/c1')))
  })
})

describe('shifts', () => {
  const shift = (uid: string, ended_at: Timestamp | null = null) => ({
    uid,
    started_at: Timestamp.now(),
    ended_at,
    business_date: DATE,
  })

  it('members can start their own open shift only', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'shifts/sh1'), shift('ana')))
    await assertFails(setDoc(doc(db('ana'), 'shifts/sh2'), shift('ben')))
    await assertFails(setDoc(doc(db('ana'), 'shifts/sh3'), shift('ana', Timestamp.now())))
  })

  it('a member can close their own open shift once', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'shifts/sh1'), shift('ana')))
    await assertSucceeds(updateDoc(doc(db('ana'), 'shifts/sh1'), { ended_at: Timestamp.now() }))
    await assertFails(updateDoc(doc(db('ana'), 'shifts/sh1'), { ended_at: Timestamp.now() }))
  })

  it('cannot close someone else’s shift or change other fields', async () => {
    await seed('shifts/sh1', shift('ana'))
    await assertFails(updateDoc(doc(db('ben'), 'shifts/sh1'), { ended_at: Timestamp.now() }))
    await assertFails(updateDoc(doc(db('ana'), 'shifts/sh1'), { business_date: '2026-09-27' }))
    await assertFails(
      updateDoc(doc(db('ana'), 'shifts/sh1'), { ended_at: Timestamp.now(), uid: 'ben' }),
    )
  })

  it('can close a shift written before ended_at existed', async () => {
    await seed('shifts/legacy', { uid: 'ana', started_at: Timestamp.now(), business_date: DATE })
    await assertSucceeds(updateDoc(doc(db('ana'), 'shifts/legacy'), { ended_at: Timestamp.now() }))
  })

  it('allows another shift after one is closed, so history is kept', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'shifts/sh1'), shift('ana')))
    await assertSucceeds(updateDoc(doc(db('ana'), 'shifts/sh1'), { ended_at: Timestamp.now() }))
    await assertSucceeds(setDoc(doc(db('ana'), 'shifts/sh2'), shift('ana')))
  })
})

describe('day_closures', () => {
  const closure = (uid: string) => ({ closed_by: uid, closed_at: serverTimestamp(), totals })

  it('a member can close a day once', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), `day_closures/${DATE}`), closure('ana')))
    await assertFails(setDoc(doc(db('ben'), `day_closures/${DATE}`), closure('ben')))
    await assertFails(updateDoc(doc(db('admin'), `day_closures/${DATE}`), { totals }))
  })

  it('validates closer, id format and totals', async () => {
    await assertFails(setDoc(doc(db('ana'), `day_closures/${DATE}`), closure('ben')))
    await assertFails(setDoc(doc(db('ana'), 'day_closures/today'), closure('ana')))
    await assertFails(setDoc(doc(db('ana'), `day_closures/${DATE}`), { ...closure('ana'), totals: {} }))
  })

  it('only an admin can delete a close day', async () => {
    await seedClosure(DATE, Timestamp.now())
    await assertFails(deleteDoc(doc(db(null), `day_closures/${DATE}`)))
    await assertFails(deleteDoc(doc(db('ana'), `day_closures/${DATE}`)))
    await assertSucceeds(deleteDoc(doc(db('admin'), `day_closures/${DATE}`)))
  })
})

describe('audit_log', () => {
  const entry = (uid: string) => ({
    action: 'void',
    target_collection: 'sales',
    target_id: 's1',
    by: uid,
    at: serverTimestamp(),
    before: { voided: false },
    after: { voided: true },
    reason: 'mali',
  })

  it('members can append entries as themselves', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'audit_log/a1'), entry('ana')))
    await assertFails(setDoc(doc(db('ana'), 'audit_log/a2'), entry('ben')))
    await assertFails(setDoc(doc(db('ana'), 'audit_log/a3'), { ...entry('ana'), action: 'delete' }))
  })

  it('only an admin can record archive_customer', async () => {
    const entry = (uid: string) => ({
      action: 'archive_customer',
      target_collection: 'customers',
      target_id: 'c1',
      by: uid,
      at: serverTimestamp(),
      before: { archived: false },
      after: { archived: true },
      reason: null,
    })
    await assertFails(setDoc(doc(db('ana'), 'audit_log/arch1'), entry('ana')))
    await assertSucceeds(setDoc(doc(db('admin'), 'audit_log/arch1'), entry('admin')))
  })

  it('only an admin can record delete_close_day', async () => {
    const deletion = (uid: string) => ({
      action: 'delete_close_day',
      target_collection: 'day_closures',
      target_id: DATE,
      by: uid,
      at: serverTimestamp(),
      before: totals,
      after: null,
      reason: null,
    })
    await assertFails(setDoc(doc(db('ana'), 'audit_log/d1'), deletion('ana')))
    await assertSucceeds(setDoc(doc(db('admin'), 'audit_log/d1'), deletion('admin')))
  })

  it('entries cannot be updated', async () => {
    await seed('audit_log/a1', { ...entry('ana'), at: Timestamp.now() })
    await assertFails(updateDoc(doc(db('ana'), 'audit_log/a1'), { reason: 'changed' }))
    await assertFails(updateDoc(doc(db('admin'), 'audit_log/a1'), { reason: 'changed' }))
  })
})

describe('delete is denied everywhere', () => {
  it('even for admins', async () => {
    await seedSale('s1', 'ana')
    await seedPayment('p1', 'ana')
    await seed('customers/c1', { name: 'J', name_key: 'j', created_by: 'ana', created_at: Timestamp.now() })
    await seed('shifts/sh1', { uid: 'ana', started_at: Timestamp.now(), business_date: DATE })
    await seedClosure(DATE, Timestamp.now())
    await seed('audit_log/a1', { action: 'void', by: 'ana' })

    for (const path of [
      'sales/s1',
      'payments/p1',
      'customers/c1',
      'shifts/sh1',
      'audit_log/a1',
      'members/ana',
    ]) {
      await assertFails(deleteDoc(doc(db('admin'), path)))
      await assertFails(deleteDoc(doc(db('ana'), path)))
    }
  })
})

describe('batched writes used by the app', () => {
  it('new customer + multi-item utang + late-entry audit in one batch', async () => {
    await seedClosure(DATE, Timestamp.fromMillis(Date.now() - 60_000))
    const fs = db('ana')
    const batch = writeBatch(fs)
    batch.set(doc(fs, 'customers/c1'), {
      name: 'Maria',
      name_key: 'maria',
      created_by: 'ana',
      created_at: serverTimestamp(),
    })
    for (const id of ['s1', 's2']) {
      batch.set(
        doc(fs, `sales/${id}`),
        sale('ana', { payment_type: 'utang', customer_id: 'c1', batch_id: 'b1', is_late_entry: true }),
      )
      batch.set(doc(fs, `audit_log/a-${id}`), {
        action: 'late_entry',
        target_collection: 'sales',
        target_id: id,
        by: 'ana',
        at: serverTimestamp(),
        before: null,
        after: { item_name: 'Coke Mismo' },
        reason: null,
      })
    }
    await assertSucceeds(batch.commit())
  })

  it('admin deletes a close day and writes the audit entry in one batch', async () => {
    await seedClosure(DATE, Timestamp.now())
    const fs = db('admin')
    const batch = writeBatch(fs)
    batch.delete(doc(fs, `day_closures/${DATE}`))
    batch.set(doc(fs, 'audit_log/del'), {
      action: 'delete_close_day',
      target_collection: 'day_closures',
      target_id: DATE,
      by: 'admin',
      at: serverTimestamp(),
      before: totals,
      after: null,
      reason: null,
    })
    await assertSucceeds(batch.commit())
  })
})
