import { useEffect, useMemo, useState } from 'react'
import { WriteErrorBanner } from '@/components/WriteErrorBanner'
import { useAuth } from '@/auth/authContext'
import { checkPersistedPendingWrites } from '@/data/syncStore'
import { useLastSyncUpdater } from '@/hooks/useLastSyncUpdater'
import { AnalyticsScreen } from '@/screens/AnalyticsScreen'
import { BentaScreen } from '@/screens/BentaScreen'
import { CloseDayScreen } from '@/screens/CloseDayScreen'
import { UtangScreen } from '@/screens/UtangScreen'
import { BottomNav } from './BottomNav'
import { EntryModeProvider } from './EntryModeProvider'
import { NavContext, type NavValue, type Tab } from './navigation'
import { SettingsScreen } from './SettingsScreen'
import { TopBar } from './TopBar'

export function AppShell() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('benta')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useLastSyncUpdater(user.uid)
  useEffect(() => checkPersistedPendingWrites(), [])

  const nav = useMemo<NavValue>(
    () => ({
      tab,
      goTo: (next) => {
        setSettingsOpen(false)
        setTab(next)
        window.scrollTo({ top: 0 })
      },
    }),
    [tab],
  )

  return (
    <NavContext.Provider value={nav}>
      <EntryModeProvider>
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
          <TopBar onOpenSettings={() => setSettingsOpen(true)} />
          <WriteErrorBanner />
          <main className="flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {settingsOpen ? (
              <SettingsScreen onBack={() => setSettingsOpen(false)} />
            ) : (
              <>
                {tab === 'benta' && <BentaScreen />}
                {tab === 'utang' && <UtangScreen />}
                {tab === 'close' && <CloseDayScreen />}
                {tab === 'analytics' && <AnalyticsScreen />}
              </>
            )}
          </main>
          <BottomNav active={settingsOpen ? null : tab} onSelect={nav.goTo} />
        </div>
      </EntryModeProvider>
    </NavContext.Provider>
  )
}
