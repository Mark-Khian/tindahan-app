import { cn } from '@/lib/utils'

interface Props<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'md' | 'sm'
  label: string
}

export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md', label }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-2 font-medium transition-colors',
            size === 'md' ? 'h-11 text-base' : 'h-9 text-sm',
            o.value === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground active:bg-background/60',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
