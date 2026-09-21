import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { session, loading, unauthorizedMessage } = useAuth()
  if (loading) return null
  if (!session) {
    return <Navigate to="/signon" replace state={unauthorizedMessage ? { message: unauthorizedMessage } : undefined} />
  }
  return <Outlet />
}
