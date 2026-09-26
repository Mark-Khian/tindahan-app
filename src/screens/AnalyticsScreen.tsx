import { ChartColumn } from 'lucide-react'

export function AnalyticsScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
      <ChartColumn className="size-12" />
      <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
      <p className="text-lg">Coming soon (Phase 2)</p>
    </div>
  )
}
