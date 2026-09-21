import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { onUnauthorized } from '../api/client'
import type { SessionResponse } from '../api/types'

interface AuthContextValue {
  session: SessionResponse | null
  loading: boolean
  signIn: (userId: string, password: string) => Promise<SessionResponse>
  signOut: () => Promise<void>
  isAdmin: boolean
}

// Exported so tests can supply a fixed value via <AuthContext.Provider> without going
// through a real sign-in flow.
// eslint-disable-next-line react-refresh/only-export-components -- test-only escape hatch
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    endpoints
      .currentSession()
      .then((s) => setSession(s.authenticated ? s : null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return onUnauthorized(() => {
      setSession(null)
      navigate('/signon', { state: { message: 'Your session has expired. Please sign on again.' }, replace: true })
    })
  }, [navigate])

  const signIn = useCallback(async (userId: string, password: string) => {
    const result = await endpoints.signOn({ userId, password })
    setSession(result)
    return result
  }, [])

  const signOut = useCallback(async () => {
    try {
      await endpoints.signOff()
    } finally {
      setSession(null)
    }
  }, [])

  const value: AuthContextValue = {
    session,
    loading,
    signIn,
    signOut,
    isAdmin: session?.userType === 'A',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
