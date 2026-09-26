import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Member } from '@/lib/types'

export interface AuthValue {
  user: User
  member: Member
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthGate>')
  return value
}
