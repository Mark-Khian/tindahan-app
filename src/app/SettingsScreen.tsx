import { useEffect, useState, type ReactNode } from 'react'
import { signOut } from 'firebase/auth'
import { ArrowLeft } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SyncIcon } from '@/components/SyncIcon'
import { useAuth } from '@/auth/authContext'
import { useSyncStatus, type SyncState } from '@/hooks/useSyncStatus'
import { formatDateTime } from '@/lib/businessDate'
import { readHiddenSuggestions, restoreHiddenSuggestions } from '@/lib/hiddenSuggestions'
import { auth } from '@/lib/firebase'
import { SegmentedControl } from '@/screens/analytics/SegmentedControl'
import {
  applyDocumentTheme,
  readThemeChoice,
  resolveTheme,
  saveThemeChoice,
  systemPrefersDark,
  watchSystemTheme,
  type ThemeChoice,
} from '@/lib/theme'

watchSystemTheme()

const APPEARANCE: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const SYNC_TEXT: Record<SyncState, string> = {
  synced: 'Synced',
  pending: 'Not synced yet',
  offline: 'Offline',
  connecting: 'Connecting…',
}

const LATEST = "You're on the latest version."
const FAILED = "Couldn't check for updates. Try again when online."

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

function storedChoice(): ThemeChoice {
  try {
    return readThemeChoice(window.localStorage)
  } catch {
    return 'system'
  }
}

function whenInstalled(worker: ServiceWorker): Promise<void> {
  if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') resolve()
    })
  })
}

function activateAndReload(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), 5000)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.clearTimeout(timer)
      window.location.reload()
      resolve(true)
    })
    worker.postMessage({ type: 'SKIP_WAITING' })
  })
}

/** Uses the service worker already registered in main. autoUpdate's generated worker accepts SKIP_WAITING. */
async function checkForAppUpdate(): Promise<'updated' | 'latest' | 'failed'> {
  if (!navigator.onLine || !('serviceWorker' in navigator)) return 'failed'
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return 'failed'

    let foundUpdate = false
    const onFound = () => {
      foundUpdate = true
    }
    registration.addEventListener('updatefound', onFound)
    try {
      await registration.update()
    } finally {
      registration.removeEventListener('updatefound', onFound)
    }

    if (registration.installing) await whenInstalled(registration.installing)

    if (registration.waiting) {
      return (await activateAndReload(registration.waiting)) ? 'updated' : 'failed'
    }
    if (foundUpdate) {
      window.location.reload()
      return 'updated'
    }
    return 'latest'
  } catch {
    return 'failed'
  }
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { member } = useAuth()
  const { state, hasPendingWrites } = useSyncStatus()
  const lastSync = member.last_sync_at?.toDate()
  const [hiddenCount, setHiddenCount] = useState(() => readHiddenSuggestions(member.id).length)
  const [appearance, setAppearance] = useState<ThemeChoice>(storedChoice)
  const [checking, setChecking] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  useEffect(() => {
    applyDocumentTheme(resolveTheme(appearance, systemPrefersDark()))
  }, [appearance])

  const restoreSuggestions = () => {
    if (!restoreHiddenSuggestions(member.id)) return
    setHiddenCount(0)
  }

  const onAppearance = (next: ThemeChoice) => {
    try {
      setAppearance(saveThemeChoice(window.localStorage, next))
    } catch {
      setAppearance('system')
    }
  }

  const onCheckUpdates = async () => {
    setChecking(true)
    setUpdateMessage(null)
    const result = await checkForAppUpdate()
    if (result === 'latest') setUpdateMessage(LATEST)
    else if (result === 'failed') setUpdateMessage(FAILED)
    setChecking(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-12 self-start px-2 text-base" onClick={onBack}>
        <ArrowLeft className="size-5" /> Back
      </Button>
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardContent className="text-base">
          <Row label="Name">{member.name}</Row>
          <Row label="Role">{member.role === 'admin' ? 'Admin' : 'Bantay'}</Row>
          <div className="flex flex-col gap-2 border-b py-3">
            <span className="text-muted-foreground">Appearance</span>
            <SegmentedControl label="Appearance" size="sm" options={APPEARANCE} value={appearance} onChange={onAppearance} />
          </div>
          <Row label="Sync">
            <span className="inline-flex items-center gap-2">
              <SyncIcon state={state} className="size-5" /> {SYNC_TEXT[state]}
            </span>
          </Row>
          <Row label="Last sync">{lastSync ? formatDateTime(lastSync) : 'Not yet'}</Row>
          <Row label="App version">{__APP_VERSION__}</Row>
          <Row label={`Hidden suggestions (${hiddenCount})`}>
            {hiddenCount > 0 && (
              <Button type="button" variant="outline" className="h-10 shrink-0 px-3" onClick={restoreSuggestions}>
                Restore all
              </Button>
            )}
          </Row>
        </CardContent>
      </Card>

      <Button type="button" variant="outline" className="h-12 text-base" disabled={checking} onClick={() => void onCheckUpdates()}>
        {checking ? 'Checking…' : 'Check for updates'}
      </Button>
      {updateMessage && <p className="text-center text-sm text-muted-foreground">{updateMessage}</p>}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="mt-6 h-12 border-destructive text-base text-destructive">
            Logout
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              An admin has to log this phone in again.
              {hasPendingWrites && (
                <span className="mt-2 block font-bold text-destructive">
                  Some entries aren't synced yet. Go online before you log out.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Not now</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void signOut(auth)}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
