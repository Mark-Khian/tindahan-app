import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useEntryTarget } from '@/app/entryMode'
import { useAuth } from '@/auth/authContext'
import { useData } from '@/data/dataContext'
import { startShift } from '@/data/writes'
import {
  beginGuardedSave,
  currentPendingOnDuty,
  describeDuty,
  requestStartDuty,
  type DutyPrompt,
  type GuardedSave,
} from '@/lib/dutyGate'

/**
 * Shared guard for today's Sales, Mag-utang, and Bayad saves.
 * Late entries are not gated. Confirm runs the existing startShift, then the original save.
 */
export function useDutyGate() {
  const { member } = useAuth()
  const { openShifts, memberNames } = useData()
  const { isLate } = useEntryTarget()
  const [prompt, setPrompt] = useState<DutyPrompt | null>(null)
  const session = useRef<GuardedSave | null>(null)
  const afterDeferredSave = useRef<(() => void) | null>(null)

  const duty = describeDuty({
    myUid: member.id,
    openShifts: openShifts.map((shift) => ({
      uid: shift.uid,
      startedAt: shift.started_at?.toMillis?.() ?? 0,
    })),
    names: memberNames,
    pendingOnDutyUid: currentPendingOnDuty(),
  })

  const goOnDuty = () => {
    requestStartDuty(member.id, startShift)
  }

  const guardSave = (save: () => void, onDeferredSave?: () => void): 'saved' | 'confirming' => {
    const gate = beginGuardedSave(
      { meOnDuty: duty.meOnDuty, otherName: duty.otherName, skip: isLate },
      { save, goOnDuty },
    )
    if (!gate.prompt) return 'saved'
    afterDeferredSave.current = onDeferredSave ?? null
    session.current = gate
    setPrompt(gate.prompt)
    return 'confirming'
  }

  const confirm = () => {
    const current = session.current
    const after = afterDeferredSave.current
    session.current = null
    afterDeferredSave.current = null
    setPrompt(null)
    current?.confirm()
    after?.()
  }

  const dismiss = () => {
    const current = session.current
    session.current = null
    afterDeferredSave.current = null
    setPrompt(null)
    current?.cancel()
  }

  const dutyDialog = (
    <AlertDialog open={prompt !== null} onOpenChange={(open) => !open && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{prompt?.title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
          <AlertDialogAction className="h-12" onClick={confirm}>
            {prompt?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { guardSave, dutyDialog }
}
