import { useMemo, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { MAX_SUGGESTIONS } from '@/lib/constants'
import { normalizeKey } from '@/lib/normalize'

type Props = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (value: string) => void
  /** Candidate values, most relevant first. Suggestions only: any typed value is allowed. */
  options: readonly string[]
  onPick?: (value: string) => void
}

export function AutocompleteInput({
  value,
  onValueChange,
  options,
  onPick,
  className,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false)

  const matches = useMemo(() => {
    const q = normalizeKey(value)
    if (!q) return []
    const starts: string[] = []
    const contains: string[] = []
    for (const opt of options) {
      const key = normalizeKey(opt)
      if (key === q) continue
      if (key.startsWith(q)) starts.push(opt)
      else if (key.includes(q)) contains.push(opt)
      if (starts.length >= MAX_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS)
  }, [value, options])

  const open = focused && matches.length > 0

  return (
    <div className="relative">
      <Input
        {...inputProps}
        value={value}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn('h-12 text-lg', className)}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
      />
      {open && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-lg hover:bg-accent active:bg-accent"
                // Keep focus in the input so the tap registers before blur hides the list.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  onValueChange(m)
                  onPick?.(m)
                }}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
