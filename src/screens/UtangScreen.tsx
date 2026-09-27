import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PendingBadge } from '@/components/EntryRows'
import { LateEntryBanner } from '@/components/LateEntryBanner'
import { useEntryTarget } from '@/app/entryMode'
import { useData } from '@/data/dataContext'
import { customersWithActiveEntries } from '@/lib/balance'
import { formatPeso } from '@/lib/money'
import { normalizeKey } from '@/lib/normalize'
import type { Customer } from '@/lib/types'
import { AddCustomerDialog } from './utang/AddCustomerDialog'
import { BayadDialog } from './utang/BayadDialog'
import { CustomerDetail } from './utang/CustomerDetail'
import { MagUtangDialog } from './utang/MagUtangDialog'

interface CustomerWithBalance {
  customer: Customer
  balance: number
}

function CustomerRow({ item, onOpen }: { item: CustomerWithBalance; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 border-b px-1 py-4 text-left active:bg-accent"
      >
        <span className="min-w-0 flex-1 text-lg font-medium break-words">{item.customer.name}</span>
        {item.customer.pending && <PendingBadge />}
        <span className={`text-lg font-bold ${item.balance > 0 ? '' : 'text-muted-foreground'}`}>
          {formatPeso(item.balance)}
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>
    </li>
  )
}

export function UtangScreen() {
  const { customers, balances, utangSales, payments } = useData()
  const { blocked } = useEntryTarget()
  const [search, setSearch] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [magUtang, setMagUtang] = useState<{ customerId: string | null } | null>(null)
  const [bayadCustomerId, setBayadCustomerId] = useState<string | null>(null)

  const activeIds = useMemo(() => customersWithActiveEntries(utangSales, payments), [utangSales, payments])

  const { owing, paid } = useMemo(() => {
    const q = normalizeKey(search)
    const rows = customers
      .filter((c) => activeIds.has(c.id) && (!q || c.name_key.includes(q)))
      .map((customer) => ({ customer, balance: balances.get(customer.id) ?? 0 }))
    return {
      owing: rows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance),
      paid: rows
        .filter((r) => r.balance <= 0)
        .sort((a, b) => a.customer.name.localeCompare(b.customer.name)),
    }
  }, [customers, balances, activeIds, search])

  const dialogs = (
    <>
      <AddCustomerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={(id) => {
          setAddOpen(false)
          setOpenCustomerId(id)
        }}
      />
      <MagUtangDialog
        open={magUtang !== null}
        initialCustomerId={magUtang?.customerId ?? null}
        onClose={() => setMagUtang(null)}
        onSaved={(id) => {
          setMagUtang(null)
          setOpenCustomerId(id)
        }}
      />
      <BayadDialog customerId={bayadCustomerId} onClose={() => setBayadCustomerId(null)} />
    </>
  )

  if (openCustomerId) {
    return (
      <div className="flex flex-col gap-4">
        <LateEntryBanner />
        <CustomerDetail
          customerId={openCustomerId}
          onBack={() => setOpenCustomerId(null)}
          onMagUtang={() => setMagUtang({ customerId: openCustomerId })}
          onBayad={() => setBayadCustomerId(openCustomerId)}
        />
        {dialogs}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LateEntryBanner />
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <Button className="h-14 text-lg" onClick={() => setMagUtang({ customerId: null })} disabled={blocked}>
          Mag-utang
        </Button>
        <Button variant="outline" className="h-14" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-5" /> Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 pl-10 text-lg"
          placeholder="Hanapin ang customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      <section>
        <h2 className="text-lg font-bold">May utang ({owing.length})</h2>
        {owing.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Walang may utang.</p>
        )}
        <ul>
          {owing.map((item) => (
            <CustomerRow key={item.customer.id} item={item} onOpen={() => setOpenCustomerId(item.customer.id)} />
          ))}
        </ul>
      </section>

      {paid.length > 0 && (
        <section>
          <button
            type="button"
            className="flex h-12 w-full items-center gap-2 text-lg font-bold"
            onClick={() => setShowPaid((v) => !v)}
            aria-expanded={showPaid}
          >
            {showPaid ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
            Walang utang ({paid.length})
          </button>
          {showPaid && (
            <ul>
              {paid.map((item) => (
                <CustomerRow key={item.customer.id} item={item} onOpen={() => setOpenCustomerId(item.customer.id)} />
              ))}
            </ul>
          )}
        </section>
      )}

      {dialogs}
    </div>
  )
}
