import { Navigate, Outlet } from 'react-router-dom'
import type { Role, Session } from '../api/types'
export function ProtectedRoute({ session, role }: { session: Session | null; role?: Role }) {
  if (!session) return <Navigate to="/sign-in" replace />
  if (role && session.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
