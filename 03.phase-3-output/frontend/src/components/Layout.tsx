import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { sessionApi } from '../api/services'
import type { Session } from '../api/types'

const standard = [
  ['Account lookup', '/accounts'],
  ['Account maintenance', '/accounts/update'],
  ['Cards', '/cards'],
  ['Card lookup', '/cards/detail'],
  ['Card maintenance', '/cards/update'],
  ['Transactions', '/transactions'],
  ['Transaction lookup', '/transactions/detail'],
  ['Add transaction', '/transactions/new'],
  ['Reports', '/reports'],
  ['Bill payment', '/payments'],
]
const admin = [
  ['Users', '/users'],
  ['Add user', '/users/new'],
  ['Update user', '/users/update'],
  ['Delete user', '/users/delete'],
]
export function Layout({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const navigate = useNavigate()
  const links = session.role === 'ADMINISTRATOR' ? admin : standard
  const logout = async () => {
    try {
      await sessionApi.logout()
    } finally {
      onLogout()
      navigate('/sign-in')
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside>
        <div className="brand">
          <span>Card</span>Demo
        </div>
        <p className="user">
          Signed in as <strong>{session.userId}</strong>
          <br />
          <small>{session.role === 'ADMINISTRATOR' ? 'Security administrator' : 'Application user'}</small>
        </p>
        <nav aria-label="Primary navigation">
          <NavLink end to="/">
            Overview
          </NavLink>
          {links.map(([label, to]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main id="main">
        <Outlet />
      </main>
    </div>
  )
}
