import { lazy, Suspense } from 'react'
import { FullScreenMessage } from './components/FullScreenMessage'
import { missingFirebaseEnv } from './lib/firebaseConfig'

// Loaded lazily so a missing config shows a readable message instead of a Firebase init crash.
const App = lazy(() => import('./App.tsx'))

export function Root() {
  if (missingFirebaseEnv.length > 0) {
    return (
      <FullScreenMessage title="Kulang ang Firebase config">
        <p className="text-muted-foreground">Ilagay ang mga ito sa .env.local:</p>
        <pre className="rounded-md bg-muted p-3 text-left text-sm">{missingFirebaseEnv.join('\n')}</pre>
      </FullScreenMessage>
    )
  }
  return (
    <Suspense fallback={<FullScreenMessage title="Tindahan" />}>
      <App />
    </Suspense>
  )
}
