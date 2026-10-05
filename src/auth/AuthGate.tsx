import { useEffect, useState, type ReactNode } from 'react'
import { FirebaseError } from 'firebase/app'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { Loader2, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenMessage } from '@/components/FullScreenMessage'
import { toMember } from '@/data/mappers'
import { auth, db } from '@/lib/firebase'
import type { Member } from '@/lib/types'
import { useOnline } from '@/hooks/useOnline'
import { AuthContext } from './authContext'
import { LoginScreen } from './LoginScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const online = useOnline()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [member, setMember] = useState<Member | null>(null)
  const [noAccess, setNoAccess] = useState(false)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'members', user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          setMember(toMember(snap))
        } else if (!snap.metadata.fromCache) {
          // Only the server can confirm "no member doc"; a cache miss offline is not proof.
          setNoAccess(true)
          setMember(null)
          void signOut(auth)
        }
      },
      (err) => {
        // Non-members cannot read anything, so the rules reject the read.
        if (err instanceof FirebaseError && err.code === 'permission-denied') {
          setNoAccess(true)
          setMember(null)
          void signOut(auth)
        } else {
          console.error('[member check]', err)
        }
      },
    )
  }, [user])

  if (noAccess) {
    return (
      <FullScreenMessage title="No access" icon={<ShieldX className="size-14 text-destructive" />}>
        <p className="text-muted-foreground">
          This account isn't registered at the store. Talk to an admin.
        </p>
        <Button className="h-12 px-8 text-base" onClick={() => setNoAccess(false)}>
          Back to sign in
        </Button>
      </FullScreenMessage>
    )
  }

  if (user === undefined) {
    return <FullScreenMessage title="Tindahan" icon={<Loader2 className="size-10 animate-spin" />} />
  }

  if (!user) return <LoginScreen />

  if (!member || member.id !== user.uid) {
    return (
      <FullScreenMessage title="Loading account…" icon={<Loader2 className="size-10 animate-spin" />}>
        {!online && (
          <p className="text-muted-foreground">No internet. You need internet the first time you open the app.</p>
        )}
      </FullScreenMessage>
    )
  }

  return <AuthContext.Provider value={{ user, member }}>{children}</AuthContext.Provider>
}
