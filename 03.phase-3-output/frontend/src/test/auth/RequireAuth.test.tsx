import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../server'
import { AuthProvider } from '../../auth/AuthContext'
import { RequireAuth } from '../../auth/RequireAuth'

function renderGuarded(initialPath = '/menu') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/signon" element={<div>Sign On Screen</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/menu" element={<div>Protected Menu</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('redirects to /signon when there is no active session', async () => {
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null }),
      ),
    )
    renderGuarded('/menu')

    expect(await screen.findByText('Sign On Screen')).toBeInTheDocument()
    expect(screen.queryByText('Protected Menu')).not.toBeInTheDocument()
  })

  it('renders the protected route once a session is confirmed authenticated', async () => {
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'USER0001', firstName: 'Reg', lastName: 'User', userType: 'U' }),
      ),
    )
    renderGuarded('/menu')

    expect(await screen.findByText('Protected Menu')).toBeInTheDocument()
    expect(screen.queryByText('Sign On Screen')).not.toBeInTheDocument()
  })

  it('renders nothing while the session check is loading (no flash of the sign-on redirect)', () => {
    server.use(http.get('/api/session', () => new Promise(() => {})))
    renderGuarded('/menu')

    expect(screen.queryByText('Sign On Screen')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Menu')).not.toBeInTheDocument()
  })
})
