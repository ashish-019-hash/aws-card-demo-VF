import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { BackLink } from '../components/BackLink'

/**
 * Admin-only screens (COUSR00C-COUSR03C) must not be usable by a regular user even if
 * they navigate directly to the URL. Mirrors the backend's 403 envelope
 * ({"code":"FORBIDDEN","message":"No access - Admin Only option."}) instead of a bare
 * redirect, per screen-flow.md's admin-only screen list.
 */
export function AdminGate({ screenId, title, children }: { screenId: string; title: string; children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return (
      <div className="screen">
        <ScreenHeader screenId={screenId} title={title} />
        <MessageBar kind="error" message="No access - Admin Only option." />
        <BackLink to="/menu" />
      </div>
    )
  }
  return <>{children}</>
}
