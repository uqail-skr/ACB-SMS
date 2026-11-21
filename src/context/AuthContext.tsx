import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, apiError, getAuthToken, setAuthToken, type AuthAccount } from '../api'
import type { Role } from '../types'

export interface AuthUser {
  username: string
  email: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  role: Role
  loading: boolean
  sessionError: string
  signedIn: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
export const roles: Role[] = ['Principal', 'Office Staff', 'Teacher', 'Parent', 'Student', 'Security Guard']
const roleNames: Record<string, Role> = {
  PRINCIPAL: 'Principal',
  OFFICE_STAFF: 'Office Staff',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  STUDENT: 'Student',
  SECURITY_GUARD: 'Security Guard',
}

function toAuthUser(account: AuthAccount): AuthUser {
  const role = roleNames[account.role]
  if (!role) throw new Error('The account has an unsupported role.')
  return { username: account.username, email: account.email, role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    let active = true
    const expireSession = () => {
      setUser(null)
      setSessionError('')
      setLoading(false)
    }
    window.addEventListener('sms:unauthorized', expireSession)

    if (!getAuthToken()) {
      setLoading(false)
    } else {
      api.currentAccount()
        .then((account) => { if (active) setUser(toAuthUser(account)) })
        .catch((error: unknown) => {
          if (getAuthToken()) setSessionError(apiError(error))
        })
        .finally(() => { if (active) setLoading(false) })
    }

    return () => {
      active = false
      window.removeEventListener('sms:unauthorized', expireSession)
    }
  }, [])

  const signIn = async (username: string, password: string) => {
    const result = await api.login(username, password)
    setAuthToken(result.access_token)
    setUser(toAuthUser(result.user))
    setSessionError('')
  }
  const signOut = () => {
    setAuthToken(null)
    setUser(null)
    setSessionError('')
  }

  return <AuthContext.Provider value={{
    user,
    role: user?.role ?? 'Principal',
    loading,
    sessionError,
    signedIn: user !== null,
    signIn,
    signOut,
  }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
