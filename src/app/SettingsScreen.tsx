import type { ReactNode } from 'react'
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
import { syncLabels, useSyncStatus } from '@/hooks/useSyncStatus'
import { formatDateTime } from '@/lib/businessDate'
import { auth } from '@/lib/firebase'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { member } = useAuth()
  const { state, hasPendingWrites } = useSyncStatus()
  const lastSync = member.last_sync_at?.toDate()

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-12 self-start px-2 text-base" onClick={onBack}>
        <ArrowLeft className="size-5" /> Bumalik
      </Button>
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardContent className="text-base">
          <Row label="Pangalan">{member.name}</Row>
          <Row label="Role">{member.role === 'admin' ? 'Admin' : 'Bantay'}</Row>
          <Row label="Sync">
            <span className="inline-flex items-center gap-2">
              <SyncIcon state={state} className="size-5" /> {syncLabels[state]}
            </span>
          </Row>
          <Row label="Huling sync">{lastSync ? formatDateTime(lastSync) : 'Wala pa'}</Row>
          <Row label="App version">{__APP_VERSION__}</Row>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="mt-6 h-12 border-destructive text-base text-destructive">
            Logout
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mag-logout?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Kailangan ng admin para maka-login ulit sa phone na ito.
              {hasPendingWrites && (
                <span className="mt-2 block font-bold text-destructive">
                  ⚠️ May mga entry pa na hindi naka-sync. Mag-online muna bago mag-logout.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Huwag na</AlertDialogCancel>
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
