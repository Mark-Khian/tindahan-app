import { useMemo, useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SaleRow } from '@/components/EntryRows'
import { ItemEntryForm } from '@/components/ItemEntryForm'
import { LateEntryBanner } from '@/components/LateEntryBanner'
import { VoidDialog } from '@/components/VoidDialog'
import { useEntryTarget } from '@/app/entryMode'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { useSalesForDate } from '@/data/queries'
import { recordCashSale, startShift, type VoidTarget } from '@/data/writes'
import { formatBusinessDate } from '@/lib/businessDate'
import { formatPeso } from '@/lib/money'
import { computeDayTotals } from '@/lib/totals'

export function BentaScreen() {
  const { member } = useAuth()
  const { onDuty } = useData()
  const { entryDate, isLate, blocked, resolveTarget } = useEntryTarget()
  const { data: sales, ready } = useSalesForDate(entryDate)
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)

  const sorted = useMemo(
    () => [...sales].sort((a, b) => b.recorded_at.toMillis() - a.recorded_at.toMillis()),
    [sales],
  )
  const totals = useMemo(() => computeDayTotals(sales, [], {}), [sales])
  const meOnDuty = onDuty?.uid === member.id

  const onSave = (item: Parameters<typeof recordCashSale>[0]) => {
    const target = resolveTarget()
    if (!target) return false
    recordCashSale(item, member.id, target)
    return true
  }

  return (
    <div className="flex flex-col gap-4">
      {meOnDuty ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-800">
          <UserCheck className="size-5" /> Ikaw ang nagbabantay ngayon.
        </div>
      ) : (
        <Button className="h-16 text-xl" onClick={() => startShift(member.id)}>
          <UserCheck className="size-6" /> Ako na ang nagbabantay
        </Button>
      )}

      <LateEntryBanner />

      <Card className="gap-1 py-4">
        <CardContent>
          <div className="text-muted-foreground">
            Kabuuang benta · {formatBusinessDate(entryDate)}
          </div>
          <div className="text-4xl font-bold">{formatPeso(totals.gross)}</div>
          <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
            <span>Cash: {formatPeso(totals.cash_sales)}</span>
            <span>Utang: {formatPeso(totals.utang_sales)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className={isLate ? 'border-2 border-amber-500' : undefined}>
        <CardContent>
          <ItemEntryForm onSave={onSave} disabled={blocked} saveLabel={isLate ? 'Save (late)' : 'Save'} />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-1 text-lg font-bold">Mga benta ({sales.length})</h2>
        {ready && sorted.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Wala pang benta.</p>
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
