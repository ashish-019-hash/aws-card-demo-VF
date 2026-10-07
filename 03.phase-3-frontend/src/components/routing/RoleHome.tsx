import { Navigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { homePathForUserType } from '../nav/navItems'

/**
 * Landing route for "/": sends type 'A' to the admin menu and type 'U' to the
 * main menu (STORY-002). Without a session it falls back to sign-in.
 */
export function RoleHome() {
  const { session } = useSession()

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return <Navigate to={homePathForUserType(session.userType)} replace />
}
