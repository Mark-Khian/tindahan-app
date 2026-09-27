import { lazy, Suspense, useMemo, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/data/dataContext'
import { useSalesRange } from '@/data/analyticsQuery'
import { useOnline } from '@/hooks/useOnline'
import {
  dailyTrend,
  getRangeDates,
  perBantay,
  salesByHour,
  summarize,
  topItems,
  weekdayAverages,
  type AnalyticsRange,
  type AnalyticsSale,
} from '@/lib/analytics'
import { formatBusinessDate, formatDateTime } from '@/lib/businessDate'
import { formatPeso } from '@/lib/money'
import { cn } from '@/lib/utils'
import { SegmentedControl } from './analytics/SegmentedControl'

const AnalyticsCharts = lazy(() =>
  import('./analytics/AnalyticsCharts').then((m) => ({ default: m.AnalyticsCharts })),
)

const RANGES = [
  { value: '7d', label: '7 araw' },
  { value: '30d', label: '30 araw' },
  { value: 'month', label: 'Ngayong buwan' },
] as const

const TOP_BY = [
  { value: 'qty', label: 'Dami' },
  { value: 'amount', label: 'Halaga' },
] as const

const EMPTY: AnalyticsSale[] = []
const qtyFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold break-words">{value}</div>
    </div>
  )
}

export function AnalyticsScreen() {
  const { today, members } = useData()
  const online = useOnline()
  const [range, setRange] = useState<AnalyticsRange>('7d')
  const [topBy, setTopBy] = useState<'qty' | 'amount'>('qty')

  const dates = useMemo(() => getRangeDates(today, range), [today, range])
  const start = dates[0]
  const end = dates[dates.length - 1]
  const { result, loading, error, refresh } = useSalesRange(start, end)
  const sales = result?.sales ?? EMPTY

  const summary = useMemo(() => summarize(sales, dates), [sales, dates])
  const top = useMemo(() => topItems(sales, topBy), [sales, topBy])
  const hours = useMemo(() => salesByHour(sales), [sales])
  const weekdays = useMemo(() => weekdayAverages(sales, dates), [sales, dates])
  const trend = useMemo(() => dailyTrend(sales, dates), [sales, dates])
  const bantay = useMemo(() => perBantay(sales, members), [sales, members])

  const rangeTitle =
    start === end ? formatBusinessDate(start) : `${formatBusinessDate(start)} – ${formatBusinessDate(end)}`

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl label="Panahon" options={RANGES} value={range} onChange={setRange} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-muted-foreground">
          {result ? `Na-update: ${formatDateTime(result.fetchedAt)}` : 'Naglo-load…'}
        </div>
        <Button variant="outline" className="h-11 shrink-0" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {result && (result.fromCache || !online) && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm">
          <WifiOff className="size-4 shrink-0" /> Offline — maaaring kulang ang data.
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-destructive p-3 text-sm text-destructive">
          Hindi ma-load ang data. Subukan ang Refresh.
        </p>
      )}

      <div className="text-muted-foreground">{rangeTitle}</div>

      {!result ? null : summary.count === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Wala pang benta sa panahong ito.</p>
      ) : (
        <>
          <Card className="gap-3 py-4">
            <CardContent className="flex flex-col gap-3 px-4">
              <div>
                <div className="text-muted-foreground">Kabuuang benta</div>
                <div className="text-4xl font-bold break-words">{formatPeso(summary.gross)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Bilang ng benta" value={String(summary.count)} />
                <Stat label="Average kada araw (kasama ngayon)" value={formatPeso(summary.avgPerDay)} />
                <Stat label="Cash" value={formatPeso(summary.cash)} />
                <Stat label="Utang" value={formatPeso(summary.utang)} />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-lg">Top 10 paninda</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4">
              <SegmentedControl label="Ayusin ayon sa" size="sm" options={TOP_BY} value={topBy} onChange={setTopBy} />
              <ol>
                {top.map((t) => (
                  <li key={t.item_key} className="flex items-start gap-3 border-b py-2 last:border-b-0">
                    <span className="w-6 shrink-0 text-right font-bold text-muted-foreground">{t.rank}</span>
                    <span className="min-w-0 flex-1 font-medium break-words">{t.name}</span>
                    <span className="shrink-0 text-right">
                      <span className={cn('block', topBy === 'qty' ? 'font-bold' : 'text-sm text-muted-foreground')}>
                        ×{qtyFormat.format(t.qty)}
                      </span>
                      <span
                        className={cn('block', topBy === 'amount' ? 'font-bold' : 'text-sm text-muted-foreground')}
                      >
                        {formatPeso(t.amount)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
            <AnalyticsCharts hours={hours} weekdays={weekdays} trend={trend} />
          </Suspense>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-lg">Kada bantay</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <ul>
                {bantay.map((b) => (
                  <li key={b.uid} className="border-b py-2 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-semibold break-words">{b.name}</span>
                      <span className="shrink-0 font-bold">{formatPeso(b.gross)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span>{b.count} benta</span>
                      <span>Cash: {formatPeso(b.cash)}</span>
                      <span>Utang: {formatPeso(b.utang)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
