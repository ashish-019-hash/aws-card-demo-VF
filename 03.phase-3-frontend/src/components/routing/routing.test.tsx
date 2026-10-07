import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import type { Session } from '../../types/session'
import { RequireRole } from './RequireRole'
import { RequireSession } from './RequireSession'
import { RoleHome } from './RoleHome'

afterEach(cleanup)

function storeSession(session: Session | null) {
  if (session) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

function renderRoutes(initialPath: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/sign-in" element={<div>sign-in page</div>} />
          <Route path="/" element={<RoleHome />} />
          <Route
            path="/menu"
            element={
              <RequireSession>
                <RequireRole role="U">
                  <div>main menu page</div>
                </RequireRole>
              </RequireSession>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireSession>
                <RequireRole role="A">
                  <div>admin menu page</div>
                </RequireRole>
              </RequireSession>
            }
          />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

afterEach(() => storeSession(null))

describe('routing guards', () => {
  it('RequireSession redirects to /sign-in without a session', () => {
    storeSession(null)
    renderRoutes('/menu')
    expect(screen.getByText('sign-in page')).toBeInTheDocument()
  })

  it("RequireRole sends a regular user away from /admin to the main menu", () => {
    storeSession({ userId: 'USER0001', userType: 'U' })
    renderRoutes('/admin')
    expect(screen.getByText('main menu page')).toBeInTheDocument()
  })

  it("RequireRole sends an administrator away from /menu to the admin menu", () => {
    storeSession({ userId: 'ADMIN001', userType: 'A' })
    renderRoutes('/menu')
    expect(screen.getByText('admin menu page')).toBeInTheDocument()
  })

  it('RoleHome routes by user type', () => {
    storeSession({ userId: 'ADMIN001', userType: 'A' })
    renderRoutes('/')
    expect(screen.getByText('admin menu page')).toBeInTheDocument()
  })

  it('RoleHome redirects to sign-in without a session', () => {
    storeSession(null)
    renderRoutes('/')
    expect(screen.getByText('sign-in page')).toBeInTheDocument()
  })
})
