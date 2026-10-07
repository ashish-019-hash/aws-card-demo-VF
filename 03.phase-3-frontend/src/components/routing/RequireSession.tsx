import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession } from '../../hooks/useSession'

export interface RequireSessionProps {
  children?: ReactNode
}

/**
 * Safety net (STORY-001): without a session every protected route redirects
 * to the sign-on screen. Works as a wrapper element or as a layout route
 * (renders <Outlet/> when no children are given).
 */
export function RequireSession({ children }: RequireSessionProps) {
  const { session } = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return children ?? <Outlet />
}
