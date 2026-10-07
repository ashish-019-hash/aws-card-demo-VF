import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
// Imported from the client module directly (not the services/api barrel) so
// tests that mock the barrel keep this subscription wiring intact.
import { onUnauthorized } from '../services/api/client'
import type { Session, SessionContextValue } from '../types/session'

/** sessionStorage key that mirrors the in-memory session so a reload keeps the user signed in. */
export const SESSION_STORAGE_KEY = 'carddemo.session'

function readStoredSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.userId === 'string' && (parsed.userType === 'A' || parsed.userType === 'U')) {
      return { userId: parsed.userId, userType: parsed.userType }
    }
  } catch {
    /* storage unavailable or corrupt: treat as signed out */
  }
  return null
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  const signIn = useCallback((next: Session) => {
    setSession(next)
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore storage failures in preview mode */
    }
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* ignore storage failures in preview mode */
    }
  }, [])

  // A protected request answered 401 means the server session expired or was
  // revoked. Clearing the frontend session here lets RequireSession route the
  // user back to sign-in to reauthenticate. The bad-credentials 401 from the
  // login endpoint itself never triggers this (see services/api/client).
  useEffect(() => onUnauthorized(signOut), [signOut])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a <SessionProvider>')
  }
  return context
}
