import { useEffect, useMemo, useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SaleRow } from '@/components/EntryRows'
import { ItemEntryForm } from '@/components/ItemEntryForm'
import { LateEntryBanner } from '@/components/LateEntryBanner'
import { VoidDialog } from '@/components/VoidDialog'
import { useEntryTarget } from '@/app/entryMode'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { useDutyGate } from '@/hooks/useDutyGate'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useSalesForDate } from '@/data/queries'
import { endShift, recordCashSale, startShift, type VoidTarget } from '@/data/writes'
import { clearPendingOnDuty, releaseDutyStartLock, requestStartDuty } from '@/lib/dutyGate'
import { formatBusinessDate } from '@/lib/businessDate'
import { activeEntries } from '@/lib/entries'
import { formatPeso } from '@/lib/money'
import { computeDayTotals } from '@/lib/totals'

export function BentaScreen() {
  const { member } = useAuth()
  const { openShifts, memberNames } = useData()
  const { errors } = useSyncStatus()
  const { entryDate, isLate, blocked, resolveTarget } = useEntryTarget()
  const { data: sales, ready } = useSalesForDate(entryDate)
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const [dutyNote, setDutyNote] = useState<string | null>(null)
  const [offDutyOpen, setOffDutyOpen] = useState(false)
  const [onDutyOpen, setOnDutyOpen] = useState(false)
  const [saleFormKey, setSaleFormKey] = useState(0)
  const { guardSave, dutyDialog } = useDutyGate()

  const sorted = useMemo(
    () => activeEntries(sales).sort((a, b) => b.recorded_at.toMillis() - a.recorded_at.toMillis()),
    [sales],
  )
  const totals = useMemo(() => computeDayTotals(sales, [], {}), [sales])
  const myOpenShifts = useMemo(
    () => openShifts.filter((s) => s.uid === member.id),
    [openShifts, member.id],
  )
  const meOnDuty = myOpenShifts.length > 0
  const onDutyName = useMemo(() => {
    let latest: (typeof openShifts)[number] | null = null
    for (const shift of openShifts) {
      const started = shift.started_at?.toMillis?.() ?? 0
      if (!latest || started >= (latest.started_at?.toMillis?.() ?? 0)) latest = shift
    }
    if (!latest || latest.uid === member.id) return null
    return memberNames[latest.uid] ?? '?'
  }, [openShifts, member.id, memberNames])

  useEffect(() => {
    const failed = errors.some((e) => e.label === 'Simula ng bantay')
    if (meOnDuty || failed) releaseDutyStartLock()
    if (failed) clearPendingOnDuty(member.id)
  }, [meOnDuty, errors, member.id])

  const goOnDuty = () => {
    if (meOnDuty) return
    setDutyNote(null)
    requestStartDuty(member.id, startShift)
  }

  const goOffDuty = () => {
    clearPendingOnDuty(member.id)
    if (myOpenShifts.length === 0) {
      setDutyNote('You are not on duty.')
      return
    }
    setDutyNote(null)
    endShift(myOpenShifts.map((s) => s.id))
  }

  const onSave = (item: Parameters<typeof recordCashSale>[0]) => {
    const target = resolveTarget()
    if (!target) return false
    const outcome = guardSave(() => recordCashSale(item, member.id, target), () =>
      setSaleFormKey((key) => key + 1),
    )
    return outcome === 'saved'
  }

  return (
    <div className="flex flex-col gap-4">
      {meOnDuty ? (
        <Button variant="destructive" className="h-16 w-full text-xl" onClick={() => setOffDutyOpen(true)}>
          <UserX className="size-6" /> Go off duty
        </Button>
      ) : (
        <Button className="h-16 text-xl" onClick={() => setOnDutyOpen(true)}>
          <UserCheck className="size-6" /> I'm on duty
        </Button>
      )}
      {dutyNote && <p className="text-sm text-muted-foreground">{dutyNote}</p>}
      {dutyDialog}
      <AlertDialog open={onDutyOpen} onOpenChange={setOnDutyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {onDutyName ? `${onDutyName} is on duty. Take over?` : 'Go on duty?'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={goOnDuty}>
              {onDutyName ? 'Take over' : "I'm on duty"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={offDutyOpen} onOpenChange={setOffDutyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go off duty?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="h-12" onClick={goOffDuty}>
              Go off duty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LateEntryBanner />

      <Card className={isLate ? 'border-2 border-amber-500' : undefined}>
        <CardContent>
          <ItemEntryForm
            key={saleFormKey}
            autoFocusItem={saleFormKey > 0}
            onSave={onSave}
            disabled={blocked}
            saveLabel={isLate ? 'Save (late)' : 'Save'}
          />
        </CardContent>
      </Card>

      <Card className="gap-1 py-4">
        <CardContent>
          <div className="text-muted-foreground">
            Today's sales · {formatBusinessDate(entryDate)}
          </div>
          <div className="text-4xl font-bold">{formatPeso(totals.cash_sales)}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Cash: {formatPeso(totals.cash_sales)}</span>
            <span>Credit: {formatPeso(totals.utang_sales)}</span>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-1 text-lg font-bold">Sales today ({sorted.length})</h2>
        {ready && sorted.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">No sales yet.</p>
        )}
        <ul>
          {sorted.map((s) => (
            <SaleRow key={s.id} sale={s} onVoid={(entry) => setVoidTarget({ kind: 'sales', entry })} />
          ))}
        </ul>
      </section>

      <VoidDialog target={voidTarget} onClose={() => setVoidTarget(null)} />
    </div>
  )
}
