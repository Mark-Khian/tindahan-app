import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyPoint, HourBucket, WeekdayAverage } from '@/lib/analytics'
import { formatBusinessDate } from '@/lib/businessDate'
import { formatPeso } from '@/lib/money'

const TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }
const GRID = 'var(--border)'
const COLOR = 'var(--primary)'

const compact = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 })
const compactPeso = (v: number) => `₱${compact.format(v)}`

function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium">{title}</div>
      <div className="font-bold">{children}</div>
    </div>
  )
}

function ChartCard({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
      </CardHeader>
      <CardContent className="px-2">{children}</CardContent>
    </Card>
  )
}

export function AnalyticsCharts({
  hours,
  weekdays,
  trend,
}: {
  hours: HourBucket[]
  weekdays: WeekdayAverage[]
  trend: DailyPoint[]
}) {
  return (
    <>
      <ChartCard title="Benta kada oras">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={6} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={compactPeso} />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as HourBucket | undefined
                return active && p ? <TooltipBox title={p.label}>{formatPeso(p.amount)}</TooltipBox> : null
              }}
            />
            <Bar dataKey="amount" fill={COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Benta kada araw ng linggo"
        caption="Average: kabuuang benta sa araw na iyon ÷ ilang beses itong lumabas sa panahong ito."
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weekdays} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={compactPeso} />
            <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={84} />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as WeekdayAverage | undefined
                if (!active || !p) return null
                return (
                  <TooltipBox title={p.name}>
                    {p.occurrences ? formatPeso(p.average) : 'Wala sa panahong ito'}
                  </TooltipBox>
                )
              }}
            />
            <Bar dataKey="average" fill={COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Benta kada araw">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="dayOfMonth" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={compactPeso} />
            <Tooltip
              cursor={{ stroke: GRID }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as DailyPoint | undefined
                return active && p ? (
                  <TooltipBox title={formatBusinessDate(p.date)}>{formatPeso(p.amount)}</TooltipBox>
                ) : null
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={COLOR}
              strokeWidth={2}
              dot={trend.length <= 7 ? { r: 3, fill: COLOR } : false}
              activeDot={{ r: 5, fill: COLOR }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  )
}
