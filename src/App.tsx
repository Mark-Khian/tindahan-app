import { AppShell } from '@/app/AppShell'
import { AuthGate } from '@/auth/AuthGate'
import { DataProvider } from '@/data/DataProvider'

export default function App() {
  return (
    <AuthGate>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </AuthGate>
  )
}
