import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession } from '../../hooks/useSession'
import type { UserType } from '../../types/session'
import { homePathForUserType } from '../nav/navItems'

export interface RequireRoleProps {
  role: UserType
  children?: ReactNode
}

/**
 * Role guard (approved decision 3): a wrong-role user is sent to their own
 * role home with an explanatory message in the shell message bar.
 */
export function RequireRole({ role, children }: RequireRoleProps) {
  const { session } = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  if (session.userType !== role) {
    const text =
      role === 'A'
        ? 'No access — Admin Only option.'
        : 'That option is available to regular users only.'
    return (
      <Navigate
        to={homePathForUserType(session.userType)}
        replace
        state={{ shellMessage: { tone: 'info', text } }}
      />
    )
  }

  return children ?? <Outlet />
}
