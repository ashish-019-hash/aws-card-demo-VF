import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { endpoints } from '../api/endpoints'
import { onUnauthorized } from '../api/client'
import type { SessionResponse } from '../api/types'

interface AuthContextValue {
  session: SessionResponse | null
  loading: boolean
  signIn: (userId: string, password: string) => Promise<SessionResponse>
  signOut: () => Promise<void>
  isAdmin: boolean
  // Set when a 401 mid-session drops the user back to Sign On, so RequireAuth's own
  // redirect (see below) can carry the explanatory message without racing an explicit
  // navigate() call. Cleared on the next successful sign-in.
  unauthorizedMessage: string | null
}

// Exported so tests can supply a fixed value via <AuthContext.Provider> without going
// through a real sign-in flow.
// eslint-disable-next-line react-refresh/only-export-components -- test-only escape hatch
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null)

  useEffect(() => {
    endpoints
      .currentSession()
      .then((s) => setSession(s.authenticated ? s : null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  // DEFECT-004 fix: the 401 redirect is owned entirely by RequireAuth (it already redirects
  // to /signon whenever session becomes null), so this listener only needs to record *why*
  // via unauthorizedMessage instead of also calling navigate() itself. Two independent
  // navigations to /signon in the same tick (one explicit here, one from RequireAuth
  // re-rendering after setSession(null)) used to race in history.replaceState, and
  // RequireAuth's state-less one usually won, wiping out the message.
  useEffect(() => {
    return onUnauthorized(() => {
      setSession(null)
      setUnauthorizedMessage('Your session has expired. Please sign on again.')
    })
  }, [])

  const signIn = useCallback(async (userId: string, password: string) => {
    const result = await endpoints.signOn({ userId, password })
    setSession(result)
    setUnauthorizedMessage(null)
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
    unauthorizedMessage,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
