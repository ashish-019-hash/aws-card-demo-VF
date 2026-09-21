import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { MenuOption } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { useAuth } from '../auth/AuthContext'
import { SCREEN_ROUTES } from './menuRoutes'

// STORY-002 (COSGN00C routes admin users to COADM01C and regular users to COMEN01C on
// sign-on): the same role split must hold for direct/bookmarked navigation to /menu or
// /admin, not just the post-sign-on redirect, so an admin can't land on the regular menu
// (and vice versa) just by typing the other URL.
export function MenuPage({ admin }: { admin: boolean }) {
  const { signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [options, setOptions] = useState<MenuOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    endpoints
      .menu()
      .then((res) => setOptions(res.options))
      .catch(() => setError('Unable to load menu options.'))
  }, [])

  if (admin !== isAdmin) {
    return <Navigate to={isAdmin ? '/admin' : '/menu'} replace />
  }

  return (
    <div className="screen">
      <ScreenHeader screenId={admin ? 'COADM01C' : 'COMEN01C'} title={admin ? 'Admin Menu' : 'Main Menu'} />
      <MessageBar kind="error" message={error} />
      <ul className="menu-list">
        {options.map((opt) => (
          <li key={opt.number}>
            <Link to={SCREEN_ROUTES[opt.targetScreen] ?? '#'}>
              {opt.number}. {opt.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="form-actions">
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate('/signon', { replace: true }))
          }}
        >
          F3 = Sign Off
        </button>
      </div>
    </div>
  )
}
