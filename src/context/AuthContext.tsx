import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role } from '../types'

interface AuthContextValue {
  role: Role
  setRole: (role: Role) => void
  signedIn: boolean
  signIn: (role: Role) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
export const roles: Role[] = ['Principal', 'Office Staff', 'Teacher', 'Parent', 'Student', 'Security Guard']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('sms-role') as Role) || 'Principal')
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem('sms-signed-in') === 'true')

  const changeRole = (next: Role) => {
    setRole(next)
    localStorage.setItem('sms-role', next)
  }
  const signIn = (next: Role) => {
    changeRole(next)
    setSignedIn(true)
    localStorage.setItem('sms-signed-in', 'true')
  }

  return <AuthContext.Provider value={{ role, setRole: changeRole, signedIn, signIn }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
