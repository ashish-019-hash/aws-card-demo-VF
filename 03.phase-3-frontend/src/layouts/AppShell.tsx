import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import '../styles/tokens.css'
import '../styles/base.css'
import { MobileDrawer } from '../components/nav/MobileDrawer'
import { homeLabelForUserType, navItemsForUserType } from '../components/nav/navItems'
import { SideNav } from '../components/nav/SideNav'
import { TopBar } from '../components/nav/TopBar'
import { MessageBar, SkipLink } from '../components/ui'
import type { MessageTone } from '../components/ui'
import { useSession } from '../hooks/useSession'
import { api } from '../services/api'
import styles from './AppShell.module.css'

/** Cross-page message passed through navigation state (role refusal, sign-out, saves). */
export interface ShellMessage {
  tone: MessageTone
  text: string
}

export interface AppShellProps {
  children: ReactNode
}

/**
 * Signed-in application frame: skip link, role-aware side nav (>=1024px) or
 * drawer (below), top bar, shell message region and the main landmark that
 * receives focus after navigation.
 */
export function AppShell({ children }: AppShellProps) {
  const { session, signOut } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dismissedMessageKey, setDismissedMessageKey] = useState<string | null>(null)
  const [previousPath, setPreviousPath] = useState(location.pathname)
  const mainRef = useRef<HTMLElement>(null)
  const previousPathRef = useRef(location.pathname)

  // Close the drawer as part of the render caused by navigation (derived
  // state pattern) instead of a cascading setState inside an effect.
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname)
    setDrawerOpen(false)
  }

  const locationState = location.state as { shellMessage?: ShellMessage } | null
  const shellMessage = dismissedMessageKey === location.key ? null : (locationState?.shellMessage ?? null)

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname
      mainRef.current?.focus()
    }
  }, [location.pathname])

  if (!session) {
    // Safety net for direct use without a RequireSession guard.
    return <Navigate to="/sign-in" replace />
  }

  const navItems = navItemsForUserType(session.userType)
  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )
  const title = activeItem?.label ?? homeLabelForUserType(session.userType)

  const handleSignOut = () => {
    signOut()
    navigate('/sign-in')
    void api.auth.logout().catch(() => {
      // The local session is already cleared. A stale server session will expire naturally.
    })
  }

  return (
    <div className={styles.root}>
      <SkipLink />
      <SideNav session={session} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} session={session} />
      <div className={styles.column}>
        <TopBar
          session={session}
          title={title}
          menuOpen={drawerOpen}
          onOpenMenu={() => setDrawerOpen(true)}
          onSignOut={handleSignOut}
        />
        <main id="main-content" tabIndex={-1} ref={mainRef} className={styles.main}>
          <div className={styles.inner}>
            {shellMessage ? (
              <MessageBar
                tone={shellMessage.tone}
                className={styles.shellMessage}
                onDismiss={() => setDismissedMessageKey(location.key)}
              >
                {shellMessage.text}
              </MessageBar>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
