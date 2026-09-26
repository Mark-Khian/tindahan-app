import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth } from '@/lib/firebase'

function loginErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-email':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Mali ang email o password.'
      case 'auth/network-request-failed':
        return 'Walang internet. Kailangan ng internet sa unang login.'
      case 'auth/too-many-requests':
        return 'Masyadong maraming subok. Maghintay muna ng ilang minuto.'
      case 'auth/user-disabled':
        return 'Naka-disable ang account na ito.'
    }
  }
  return 'Hindi maka-login. Subukan ulit.'
}

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Store className="size-14 text-primary" />
        <h1 className="text-3xl font-bold">Tindahan</h1>
        <p className="text-muted-foreground">Para sa admin: i-login ang phone na ito isang beses lang.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-base">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            className="h-12 text-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-base">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-12 text-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="rounded-md bg-destructive/10 p-3 text-destructive">{error}</p>}
        <Button type="submit" className="h-14 text-lg" disabled={busy}>
          {busy ? 'Naglo-login...' : 'Mag-login'}
        </Button>
      </form>
    </div>
  )
}
