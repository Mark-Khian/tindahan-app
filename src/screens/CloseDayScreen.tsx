import { useState, useMemo } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Lock, MoreHorizontal } from 'lucide-react'
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
import { toShift } from '@/data/mappers'
import { useLastSaleDateBefore, useSalesForDate } from '@/data/queries'
import { useLiveQuery } from '@/data/useLiveQuery'
import { purgeVoidedEntry } from '@/data/purgeEntry'
import { closeDay, deleteCloseDay } from '@/data/writes'
import { useNow } from '@/hooks/useNow'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { activeMembersToday } from '@/lib/activeToday'
import { formatBusinessDate, formatDateTime } from '@/lib/businessDate'
import { db } from '@/lib/firebase'
import { deleteClosingMenuVisible } from '@/lib/deleteCloseDay'
import { deletedEntries, type DeletedEntry } from '@/lib/entries'
import { purgeMenuVisible } from '@/lib/purgeEntry'
import { formatPeso } from '@/lib/money'
import { computeDayTotals, totalsDiffer } from '@/lib/totals'
import type { DayClosure, DayTotals, Payment, Sale } from '@/lib/types'

function ClosureHistoryRow({
  closure,
  selected,
  canDelete,
  closedBy,
  onSelect,
  onAskDelete,
}: {
  closure: DayClosure
  selected: boolean
  canDelete: boolean
  closedBy: string
  onSelect: () => void
  onAskDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-xl border py-3 text-left shadow-sm active:bg-accent ${canDelete ? 'pr-12 pl-3' : 'px-3'} ${selected ? 'bg-accent' : 'bg-card'}`}
      >
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{formatBusinessDate(closure.id)}</div>
          <div className="text-sm text-muted-foreground">By {closedBy}</div>
        </div>
        {closure.pending && <PendingBadge />}
        <span className="font-bold">{formatPeso(closure.totals.expected_cash)}</span>
      </button>
      {canDelete && (
        <div className="absolute top-1/2 right-1 z-10 -translate-y-1/2">
          <button
            type="button"
            className="flex size-10 min-h-10 min-w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
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
              <div className="absolute top-10 right-0 z-40 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                <button
                  type="button"
                  className="flex h-11 w-full items-center rounded-md px-3 text-left font-medium whitespace-nowrap text-destructive"
                  onClick={() => {
                    setMenuOpen(false)
                    onAskDelete()
                  }}
                >
                  Delete closing
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function TotalsTable({ totals }: { totals: DayTotals }) {
  const rows: [string, number][] = [
    ['Total sales', totals.gross],
    ['Cash sales', totals.cash_sales],
    ['Credit sales', totals.utang_sales],
    ['Credit payments', totals.utang_payments],
  ]
  const members = Object.entries(totals.per_member).sort((a, b) => a[1].name.localeCompare(b[1].name))
  const showCash = members.some(([, m]) => m.cash_sales !== 0)
  const showCredit = members.some(([, m]) => m.utang_sales !== 0)
  const showPaid = members.some(([, m]) => m.payments !== 0)
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
          <dt className="font-bold">Expected cash</dt>
          <dd className="text-2xl font-bold">{formatPeso(totals.expected_cash)}</dd>
        </div>
      </dl>
      {members.length > 0 && (
        <div className="min-w-0">
          <h3 className="mb-1 font-bold">By person</h3>
          <table className="w-full table-fixed text-xs leading-tight">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1 pr-1 text-left font-medium">Name</th>
                {showCash && <th className="px-px py-1 text-right font-medium">Cash</th>}
                {showCredit && <th className="px-px py-1 text-right font-medium">Credit</th>}
                {showPaid && <th className="px-px py-1 text-right font-medium">Paid</th>}
                <th className="py-1 pl-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {members.map(([uid, m]) => (
                <tr key={uid} className="border-b">
                  <td className="py-1 pr-1 text-left font-medium break-words">{m.name}</td>
                  {showCash && (
                    <td className="px-px py-1 text-right text-[11px] tabular-nums whitespace-nowrap">
                      {formatPeso(m.cash_sales)}
                    </td>
                  )}
                  {showCredit && (
                    <td className="px-px py-1 text-right text-[11px] tabular-nums whitespace-nowrap">
                      {formatPeso(m.utang_sales)}
                    </td>
                  )}
                  {showPaid && (
                    <td className="px-px py-1 text-right text-[11px] tabular-nums whitespace-nowrap">
                      {formatPeso(m.payments)}
                    </td>
                  )}
                  <td className="py-1 pl-1 text-right text-[11px] font-semibold tabular-nums whitespace-nowrap">
                    {formatPeso(m.gross)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SyncWarnings({
  staleMembers,
  devicePending,
}: {
  staleMembers: { name: string }[]
  devicePending: boolean
}) {
  if (!devicePending && staleMembers.length === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-md border border-amber-400 bg-amber-50 p-3 text-amber-900">
      {devicePending && <p className="font-semibold">This phone has entries that are not synced yet.</p>}
      {staleMembers.length > 0 && (
        <p>
          Not synced for a while: <b>{staleMembers.map((m) => m.name).join(', ')}</b>. Their latest entries may be
          missing.
        </p>
      )}
    </div>
  )
}

function DeletedEntriesSection({ sales, payments }: { sales: Sale[]; payments: Payment[] }) {
  const { member } = useAuth()
  const { memberNames, customersById } = useData()
  const [open, setOpen] = useState(false)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [pendingPurge, setPendingPurge] = useState<DeletedEntry | null>(null)
  const deleted = useMemo(() => deletedEntries(sales, payments), [sales, payments])
  const showMenu = purgeMenuVisible(member.role)
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
          Deleted entries ({deleted.length})
          <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <ul className="border-t">
            {deleted.map((d) => {
              const e = d.entry
              const key = `${d.kind}-${e.id}`
              const title =
                d.kind === 'sale'
                  ? d.entry.item_name
                  : `Payment – ${customersById.get(d.entry.customer_id)?.name ?? 'Unknown'}`
              const amount = d.kind === 'sale' ? d.entry.subtotal : d.entry.amount
              const recordedBy = d.kind === 'sale' ? d.entry.recorded_by : d.entry.received_by
              const menuOpen = menuKey === key
              return (
                <li key={key} className="flex flex-col gap-0.5 border-b py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-1">
                    <span className="min-w-0 flex-1 font-semibold break-words">{title}</span>
                    <span className="shrink-0 pt-2 font-bold">{formatPeso(amount)}</span>
                    {showMenu && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          className="flex size-10 min-h-10 min-w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          aria-label="More options"
                          aria-expanded={menuOpen}
                          onClick={() => setMenuKey(menuOpen ? null : key)}
                        >
                          <MoreHorizontal className="size-5" />
                        </button>
                        {menuOpen && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-30 cursor-default"
                              aria-label="Close menu"
                              onClick={() => setMenuKey(null)}
                            />
                            <div className="absolute top-10 right-0 z-40 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                              <button
                                type="button"
                                className="flex h-11 w-full items-center rounded-md px-3 text-left font-medium whitespace-nowrap text-destructive"
                                onClick={() => {
                                  setMenuKey(null)
                                  setPendingPurge(d)
                                }}
                              >
                                Delete permanently
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Recorded by {memberNames[recordedBy] ?? 'Unknown'} · Deleted by{' '}
                    {memberNames[e.voided_by ?? ''] ?? 'Unknown'}
                  </div>
                  <div className="text-sm break-words">Reason: {e.void_reason ?? '—'}</div>
                  {e.voided_at && (
                    <div className="text-sm text-muted-foreground">{formatDateTime(e.voided_at.toDate())}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <AlertDialog open={pendingPurge !== null} onOpenChange={(next) => !next && setPendingPurge(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This removes the entry for good. A copy is kept in the audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-12"
                onClick={() => {
                  if (!pendingPurge) return
                  purgeVoidedEntry(
                    pendingPurge.kind === 'sale' ? 'sales' : 'payments',
                    pendingPurge.entry,
                    member.id,
                  )
                  setPendingPurge(null)
                }}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export function CloseDayScreen() {
  const { member } = useAuth()
  const { today, members, memberNames, closures, closuresById, payments, todaySales, openShifts } = useData()
  const { hasPendingWrites } = useSyncStatus()
  const { startLateEntry } = useEntryMode()
  const { goTo } = useNav()
  const now = useNow()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DayClosure | null>(null)
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

  const shiftsQuery = useMemo(
    () => query(collection(db, 'shifts'), where('business_date', '==', today)),
    [today],
  )
  const todayShifts = useLiveQuery(shiftsQuery, toShift, false)
  const syncStatus = useMemo(
    () =>
      activeMembersToday({
        today,
        now,
        dayClosed: closuresById.has(today),
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          lastSyncAt: m.last_sync_at ? m.last_sync_at.toDate() : null,
        })),
        onDutyIds: openShifts.map((s) => s.uid),
        shiftMemberIds: todayShifts.data.map((s) => s.uid),
        saleMemberIds: todaySales.map((s) => s.recorded_by),
        paymentMemberIds: payments.filter((p) => p.business_date === today).map((p) => p.received_by),
      }),
    [today, now, closuresById, members, openShifts, todayShifts.data, todaySales, payments],
  )
  const staleMembers = syncStatus.members.filter((m) => m.stale)
  const pastClosures = useMemo(
    () => [...closures].filter((c) => c.id !== today).sort((a, b) => b.id.localeCompare(a.id)),
    [closures, today],
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {unclosedPrevious && unclosedPrevious !== date && (
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" />
            <span>{formatBusinessDate(unclosedPrevious)} is not closed yet</span>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={() => setSelectedDate(unclosedPrevious)}>
            View
          </Button>
        </div>
      )}

      {date !== today && (
        <Button variant="ghost" className="h-12 self-start px-2 text-base" onClick={() => setSelectedDate(null)}>
          <ArrowLeft className="size-5" /> Back to today
        </Button>
      )}

      <div>
        <div className="text-muted-foreground">{date === today ? 'Today' : 'Business date'}</div>
        <h1 className="text-2xl font-bold">{formatBusinessDate(date)}</h1>
      </div>

      {syncStatus.showCard && (
        <Card>
          <CardHeader>
            <CardTitle>Sync status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {syncStatus.members.length > 0 && (
              <ul>
                {syncStatus.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                    <span className="font-medium break-words">{m.name}</span>
                    <span className={`text-right ${m.stale ? 'font-semibold text-amber-700' : 'text-muted-foreground'}`}>
                      {m.stale && '⚠️ '}
                      {m.lastSyncAt ? formatDateTime(m.lastSyncAt) : 'Not synced yet'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {staleMembers.length === 0 && <p className="text-muted-foreground">Everyone is synced.</p>}
            <SyncWarnings staleMembers={staleMembers} devicePending={hasPendingWrites} />
          </CardContent>
        </Card>
      )}

      {closure ? (
        <Card>
          <CardHeader className="px-3">
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" /> Closed
              {closure.pending && <PendingBadge />}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              By {memberNames[closure.closed_by] ?? 'Unknown'}
              {closure.closed_at && ` · ${formatDateTime(closure.closed_at.toDate())}`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-3">
            <TotalsTable totals={closure.totals} />
            {(hasLateEntries || changedAfterClose) && (
              <div className="flex flex-col gap-3 rounded-lg border-2 border-amber-500 p-3">
                <h3 className="font-bold text-amber-800">
                  {hasLateEntries ? 'Late entries' : 'Changed after closing'}
                </h3>
                {changedAfterClose ? (
                  <>
                    <p className="text-sm text-muted-foreground">Adjusted totals (includes all changes):</p>
                    <TotalsTable totals={liveTotals} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No change to the totals.</p>
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
              Add late entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="px-3">
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-3">
            <TotalsTable totals={liveTotals} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="h-16 text-xl" disabled={!ready}>
                  <CheckCircle2 className="size-6" /> Close Day
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close {formatBusinessDate(date)}?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="flex flex-col gap-3 text-base">
                      <p>
                        Expected cash:{' '}
                        <b className="text-foreground">{formatPeso(liveTotals.expected_cash)}</b>
                      </p>
                      <SyncWarnings staleMembers={staleMembers} devicePending={hasPendingWrites} />
                      <p>After closing, only late entries can be added for this day.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-12">Not now</AlertDialogCancel>
                  <AlertDialogAction className="h-12" onClick={() => closeDay(date, liveTotals, member.id)}>
                    Yes, close
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {member.role === 'admin' && <DeletedEntriesSection key={date} sales={sales} payments={dayPayments} />}

      <section>
        <h2 className="mb-1 text-lg font-bold">Past closings</h2>
        {pastClosures.length === 0 && <p className="py-4 text-center text-muted-foreground">None yet.</p>}
        <ul className="space-y-2">
          {pastClosures.map((c) => (
            <ClosureHistoryRow
              key={c.id}
              closure={c}
              selected={c.id === date}
              canDelete={deleteClosingMenuVisible(member.role)}
              closedBy={memberNames[c.closed_by] ?? 'Unknown'}
              onSelect={() => setSelectedDate(c.id === today ? null : c.id)}
              onAskDelete={() => setPendingDelete(c)}
            />
          ))}
        </ul>
        <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this closing?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This reopens {pendingDelete ? formatBusinessDate(pendingDelete.id) : ''}. Sales from that
                day are kept, and the day can be closed again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-12"
                onClick={() => {
                  if (!pendingDelete) return
                  deleteCloseDay(pendingDelete, member.id)
                  setPendingDelete(null)
                }}
              >
                Delete closing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  )
}
