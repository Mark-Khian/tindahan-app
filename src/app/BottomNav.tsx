import { CalendarCheck, ChartColumn, NotebookPen, ShoppingCart, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tab } from './navigation'

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'benta', label: 'Benta', icon: ShoppingCart },
  { id: 'utang', label: 'Utang', icon: NotebookPen },
  { id: 'close', label: 'Close Day', icon: CalendarCheck },
  { id: 'analytics', label: 'Analytics', icon: ChartColumn },
]

export function BottomNav({ active, onSelect }: { active: Tab | null; onSelect: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                'flex h-16 w-full flex-col items-center justify-center gap-1 text-sm',
                active === id ? 'font-bold text-primary' : 'text-muted-foreground',
              )}
              aria-current={active === id ? 'page' : undefined}
            >
              <Icon className="size-6" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
