import { createContext, useContext } from 'react'

export type Tab = 'benta' | 'utang' | 'close' | 'analytics'

export interface NavValue {
  tab: Tab
  goTo: (tab: Tab) => void
}

export const NavContext = createContext<NavValue | null>(null)

export function useNav(): NavValue {
  const value = useContext(NavContext)
  if (!value) throw new Error('useNav must be used inside <AppShell>')
  return value
}
