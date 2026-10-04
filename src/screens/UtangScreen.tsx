import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Search } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PendingBadge } from '@/components/EntryRows'
import { LateEntryBanner } from '@/components/LateEntryBanner'
import { useEntryTarget } from '@/app/entryMode'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { archiveCustomer } from '@/data/writes'
import { customersWithActiveEntries } from '@/lib/balance'
import { canShowPaidUpDelete, visibleCustomers } from '@/lib/customerArchive'
import { formatPeso } from '@/lib/money'
import type { Customer } from '@/lib/types'
import { BayadDialog } from './utang/BayadDialog'
import { CustomerDetail } from './utang/CustomerDetail'
import { MagUtangDialog } from './utang/MagUtangDialog'

interface CustomerWithBalance {
  customer: Customer
  balance: number
}

function CustomerRow({
  item,
  onOpen,
  onDelete,
}: {
  item: CustomerWithBalance
  onOpen: () => void
  onDelete?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <li className="flex items-center border-b">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 px-1 py-4 text-left active:bg-accent"
      >
        <span className="min-w-0 flex-1 text-lg font-medium break-words">{item.customer.name}</span>
        {item.customer.pending && <PendingBadge />}
        <span className={`text-lg font-bold ${item.balance > 0 ? '' : 'text-muted-foreground'}`}>
          {formatPeso(item.balance)}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
      {onDelete && (
        <div className="relative">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="size-5" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-10 right-0 z-40 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                <button
                  type="button"
                  className="flex h-11 w-full items-center rounded-md px-3 text-left font-medium text-destructive"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export function UtangScreen() {
  const { member } = useAuth()
  const { customers, balances, utangSales, payments } = useData()
  const { blocked } = useEntryTarget()
  const [search, setSearch] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null)
  const [magUtang, setMagUtang] = useState<{ customerId: string | null } | null>(null)
  const [bayadCustomerId, setBayadCustomerId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)

  const activeIds = useMemo(() => customersWithActiveEntries(utangSales, payments), [utangSales, payments])

  const { owing, paid } = useMemo(() => {
    const rows = visibleCustomers(customers, search)
      .filter((c) => activeIds.has(c.id))
      .map((customer) => ({ customer, balance: balances.get(customer.id) ?? 0 }))
    return {
      owing: rows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance),
      paid: rows
        .filter((r) => r.balance <= 0)
        .sort((a, b) => a.customer.name.localeCompare(b.customer.name)),
    }
  }, [customers, balances, activeIds, search])

  const deleteDialog = (
    <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Their history is kept. They'll come back if they take credit again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-12"
            onClick={() => {
              if (!pendingDelete) return
              archiveCustomer(pendingDelete.id, member.id)
              setPendingDelete(null)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const dialogs = (
    <>
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
      {deleteDialog}
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
      <Button className="h-14 w-full text-lg" onClick={() => setMagUtang({ customerId: null })} disabled={blocked}>
        Add credit
      </Button>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 pl-10 text-lg"
          placeholder="Search customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      <section>
        <h2 className="text-lg font-bold">With balance ({owing.length})</h2>
        {owing.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">No one with a balance.</p>
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
            Paid up ({paid.length})
          </button>
          {showPaid && (
            <ul>
              {paid.map((item) => (
                <CustomerRow
                  key={item.customer.id}
                  item={item}
                  onOpen={() => setOpenCustomerId(item.customer.id)}
                  onDelete={
                    canShowPaidUpDelete(member.role, item.balance)
                      ? () => setPendingDelete(item.customer)
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {dialogs}
    </div>
  )
}
