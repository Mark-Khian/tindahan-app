import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Lock } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PendingBadge } from '@/components/EntryRows'
import { useEntryMode } from '@/app/entryMode'
import { useNav } from '@/app/navigation'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { useLastSaleDateBefore, useSalesForDate } from '@/data/queries'
import { closeDay } from '@/data/writes'
import { useNow } from '@/hooks/useNow'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { formatBusinessDate, formatDateTime } from '@/lib/businessDate'
import { STALE_SYNC_MINUTES } from '@/lib/constants'
import { deletedEntries } from '@/lib/entries'
import { formatPeso } from '@/lib/money'
import { computeDayTotals, totalsDiffer } from '@/lib/totals'
import type { DayTotals, Member, Payment, Sale } from '@/lib/types'

function TotalsTable({ totals }: { totals: DayTotals }) {
  const rows: [string, number][] = [
    ['Gross', totals.gross],
    ['Cash sales', totals.cash_sales],
    ['Utang sales', totals.utang_sales],
    ['Bayad sa utang', totals.utang_payments],
  ]
  const members = Object.entries(totals.per_member).sort((a, b) => a[1].name.localeCompare(b[1].name))
  return (
    <div className="flex flex-col gap-3">
      <dl className="text-base">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{formatPeso(value)}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between rounded-md bg-emerald-50 p-3 text-emerald-900">
          <dt className="font-bold">Dapat na pera sa kaha</dt>
          <dd className="text-2xl font-bold">{formatPeso(totals.expected_cash)}</dd>
        </div>
      </dl>
      {members.length > 0 && (
        <div>
          <h3 className="mb-1 font-bold">Bawat bantay</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b text-right">
                  <th className="py-2 text-left font-medium">Pangalan</th>
                  <th className="font-medium">Cash</th>
                  <th className="font-medium">Utang</th>
                  <th className="font-medium">Bayad</th>
                  <th className="font-medium">Gross</th>
                </tr>
              </thead>
              <tbody>
                {members.map(([uid, m]) => (
                  <tr key={uid} className="border-b text-right">
                    <td className="py-2 text-left font-medium">{m.name}</td>
                    <td>{formatPeso(m.cash_sales)}</td>
                    <td>{formatPeso(m.utang_sales)}</td>
                    <td>{formatPeso(m.payments)}</td>
                    <td className="font-semibold">{formatPeso(m.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function isStale(m: Member, now: Date) {
  if (!m.last_sync_at) return true
  return now.getTime() - m.last_sync_at.toMillis() > STALE_SYNC_MINUTES * 60_000
}

function SyncWarnings({ staleMembers, devicePending }: { staleMembers: Member[]; devicePending: boolean }) {
  if (!devicePending && staleMembers.length === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-md border border-amber-400 bg-amber-50 p-3 text-amber-900">
      {devicePending && <p className="font-semibold">⚠️ May entry sa phone na ito na hindi pa naka-sync.</p>}
      {staleMembers.length > 0 && (
        <p>
          ⚠️ Matagal nang hindi nag-sync: <b>{staleMembers.map((m) => m.name).join(', ')}</b>. Baka may
          entries pa sila na wala rito.
        </p>
      )}
    </div>
  )
}

function DeletedEntriesSection({ sales, payments }: { sales: Sale[]; payments: Payment[] }) {
  const { memberNames, customersById } = useData()
  const [open, setOpen] = useState(false)
  const deleted = useMemo(() => deletedEntries(sales, payments), [sales, payments])
  if (deleted.length === 0) return null

  return (
    <Card className="py-2">
      <CardContent className="px-4">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-lg font-bold"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Mga na-delete ({deleted.length})
          <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <ul className="border-t">
            {deleted.map((d) => {
              const e = d.entry
              const title =
                d.kind === 'sale'
                  ? d.entry.item_name
                  : `Bayad – ${customersById.get(d.entry.customer_id)?.name ?? '?'}`
              const amount = d.kind === 'sale' ? d.entry.subtotal : d.entry.amount
              const recordedBy = d.kind === 'sale' ? d.entry.recorded_by : d.entry.received_by
              return (
                <li key={`${d.kind}-${e.id}`} className="flex flex-col gap-0.5 border-b py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-semibold break-words">{title}</span>
                    <span className="shrink-0 font-bold">{formatPeso(amount)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nag-record: {memberNames[recordedBy] ?? '?'} · Nag-delete: {memberNames[e.voided_by ?? ''] ?? '?'}
                  </div>
                  <div className="text-sm break-words">Dahilan: {e.void_reason ?? '—'}</div>
                  {e.voided_at && (
                    <div className="text-sm text-muted-foreground">{formatDateTime(e.voided_at.toDate())}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function CloseDayScreen() {
  const { member } = useAuth()
  const { today, members, memberNames, closures, closuresById, payments } = useData()
  const { hasPendingWrites } = useSyncStatus()
  const { startLateEntry } = useEntryMode()
  const { goTo } = useNav()
  const now = useNow()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const date = selectedDate ?? today

  const lastSaleDate = useLastSaleDateBefore(today)
  const previousActiveDate = useMemo(() => {
    let latest = lastSaleDate
    for (const p of payments) {
      if (p.business_date < today && (!latest || p.business_date > latest)) latest = p.business_date
    }
    return latest
  }, [lastSaleDate, payments, today])
  const unclosedPrevious =
    previousActiveDate && !closuresById.has(previousActiveDate) ? previousActiveDate : null

  const { data: sales, ready } = useSalesForDate(date)
  const dayPayments = useMemo(() => payments.filter((p) => p.business_date === date), [payments, date])
  const liveTotals = useMemo(
    () => computeDayTotals(sales, dayPayments, memberNames),
    [sales, dayPayments, memberNames],
  )
  const closure = closuresById.get(date)
  const hasLateEntries = sales.some((s) => s.is_late_entry) || dayPayments.some((p) => p.is_late_entry)
  const changedAfterClose = closure ? totalsDiffer(closure.totals, liveTotals) : false

  const staleMembers = members.filter((m) => isStale(m, now))
  const sortedClosures = useMemo(() => [...closures].sort((a, b) => b.id.localeCompare(a.id)), [closures])

  return (
    <div className="flex flex-col gap-4">
      {unclosedPrevious && unclosedPrevious !== date && (
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" />
            <span>Hindi pa naka-close ang {formatBusinessDate(unclosedPrevious)}</span>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={() => setSelectedDate(unclosedPrevious)}>
            Tingnan
          </Button>
        </div>
      )}

      {date !== today && (
        <Button variant="ghost" className="h-12 self-start px-2 text-base" onClick={() => setSelectedDate(null)}>
          <ArrowLeft className="size-5" /> Bumalik sa ngayon
        </Button>
      )}

      <div>
        <div className="text-muted-foreground">{date === today ? 'Business date ngayon' : 'Business date'}</div>
        <h1 className="text-2xl font-bold">{formatBusinessDate(date)}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ul>
            {members.map((m) => {
              const stale = isStale(m, now)
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                  <span className="font-medium break-words">{m.name}</span>
                  <span className={`text-right ${stale ? 'font-semibold text-amber-700' : 'text-muted-foreground'}`}>
                    {stale && '⚠️ '}
                    {m.last_sync_at ? formatDateTime(m.last_sync_at.toDate()) : 'Hindi pa nag-sync'}
                  </span>
                </li>
              )
            })}
          </ul>
          <SyncWarnings staleMembers={staleMembers} devicePending={hasPendingWrites} />
        </CardContent>
      </Card>

      {closure ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" /> Naka-close na
              {closure.pending && <PendingBadge />}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ni {memberNames[closure.closed_by] ?? '?'}
              {closure.closed_at && ` · ${formatDateTime(closure.closed_at.toDate())}`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TotalsTable totals={closure.totals} />
            {(hasLateEntries || changedAfterClose) && (
              <div className="flex flex-col gap-3 rounded-lg border-2 border-amber-500 p-3">
                <h3 className="font-bold text-amber-800">
                  {hasLateEntries ? 'May late entries' : 'May pagbabago pagkatapos mag-close'}
                </h3>
                {changedAfterClose ? (
                  <>
                    <p className="text-sm text-muted-foreground">Adjusted totals (kasama ang lahat ng pagbabago):</p>
                    <TotalsTable totals={liveTotals} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Walang epekto sa totals.</p>
                )}
              </div>
            )}
            <Button
              variant="outline"
              className="h-12 text-base"
              onClick={() => {
                startLateEntry(date)
                goTo('benta')
              }}
            >
              Magdagdag ng late entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TotalsTable totals={liveTotals} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="h-16 text-xl" disabled={!ready}>
                  <CheckCircle2 className="size-6" /> Close Day
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>I-close ang {formatBusinessDate(date)}?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="flex flex-col gap-3 text-base">
                      <p>
                        Dapat na pera sa kaha:{' '}
                        <b className="text-foreground">{formatPeso(liveTotals.expected_cash)}</b>
                      </p>
                      <SyncWarnings staleMembers={staleMembers} devicePending={hasPendingWrites} />
                      <p>Pagka-close, late entry na lang ang puwedeng idagdag sa araw na ito.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-12">Huwag muna</AlertDialogCancel>
                  <AlertDialogAction className="h-12" onClick={() => closeDay(date, liveTotals, member.id)}>
                    Oo, i-close
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {member.role === 'admin' && <DeletedEntriesSection key={date} sales={sales} payments={dayPayments} />}

      <section>
        <h2 className="mb-1 text-lg font-bold">Mga nakaraang close</h2>
        {sortedClosures.length === 0 && <p className="py-4 text-center text-muted-foreground">Wala pa.</p>}
        <ul className="space-y-2">
          {sortedClosures.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedDate(c.id === today ? null : c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-1 py-3 text-left active:bg-accent ${c.id === date ? 'bg-accent' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{formatBusinessDate(c.id)}</div>
                  <div className="text-sm text-muted-foreground">Ni {memberNames[c.closed_by] ?? '?'}</div>
                </div>
                {c.pending && <PendingBadge />}
                <span className="font-bold">{formatPeso(c.totals.expected_cash)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
