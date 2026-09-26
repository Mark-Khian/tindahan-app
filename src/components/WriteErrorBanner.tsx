import { X } from 'lucide-react'
import { dismissWriteError } from '@/data/syncStore'
import { useSyncStatus } from '@/hooks/useSyncStatus'

/** Writes rejected by the server (e.g. security rules) disappear locally, so say so loudly. */
export function WriteErrorBanner() {
  const { errors } = useSyncStatus()
  if (errors.length === 0) return null
  return (
    <div className="flex flex-col gap-2 px-4 pt-3">
      {errors.map((e) => (
        <div
          key={e.id}
          className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive"
        >
          <div className="flex-1 text-sm">
            <div className="font-bold">Hindi na-save: {e.label}</div>
            <div>{e.message}</div>
          </div>
          <button
            type="button"
            className="p-1"
            onClick={() => dismissWriteError(e.id)}
            aria-label="Isara"
          >
            <X className="size-5" />
          </button>
        </div>
      ))}
    </div>
  )
}
