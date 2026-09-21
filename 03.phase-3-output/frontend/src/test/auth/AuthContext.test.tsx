import { HttpResponse, http } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { server } from '../server'
import { AuthProvider, useAuth } from '../../auth/AuthContext'
import { RequireAuth } from '../../auth/RequireAuth'
import { api } from '../../api/client'

function ProtectedScreen() {
  const { session, isAdmin, signOut } = useAuth()
  return (
    <div>
      <div>Signed in as {session?.userId}</div>
      <div>isAdmin: {String(isAdmin)}</div>
      <button onClick={() => void api.get('/api/secret-thing').catch(() => {})}>Trigger 401</button>
      <button onClick={() => void signOut()}>Sign Off</button>
    </div>
  )
}

function SignOnScreen() {
  const location = useLocation() as { state?: { message?: string } }
  return (
    <div>
      <div>Sign On Screen</div>
      {location.state?.message && <div>{location.state.message}</div>}
    </div>
  )
}

function renderApp(initialPath = '/menu') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/signon" element={<SignOnScreen />} />
          <Route element={<RequireAuth />}>
            <Route path="/menu" element={<ProtectedScreen />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthContext', () => {
  it('exposes isAdmin=true only for userType A (screen-flow.md admin-only gating)', async () => {
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'ADMIN001', firstName: 'Ad', lastName: 'Min', userType: 'A' }),
      ),
    )
    renderApp()
    expect(await screen.findByText('isAdmin: true')).toBeInTheDocument()
  })

  it('exposes isAdmin=false for a regular userType U', async () => {
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'USER0001', firstName: 'Reg', lastName: 'User', userType: 'U' }),
      ),
    )
    renderApp()
    expect(await screen.findByText('isAdmin: false')).toBeInTheDocument()
  })

  it('redirects to /signon with the session-expired message on any 401 response (DEFECT-004, resolved)', async () => {
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'USER0001', firstName: 'Reg', lastName: 'User', userType: 'U' }),
      ),
      http.get('/api/secret-thing', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Session expired.' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Signed in as USER0001')

    await user.click(screen.getByRole('button', { name: 'Trigger 401' }))

    await waitFor(() => {
      expect(screen.getByText('Sign On Screen')).toBeInTheDocument()
    })
    expect(await screen.findByText('Your session has expired. Please sign on again.')).toBeInTheDocument()
  })

  it('signOut clears the session and calls DELETE /api/session', async () => {
    let deleteCalled = false
    server.use(
      http.get('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'USER0001', firstName: 'Reg', lastName: 'User', userType: 'U' }),
      ),
      http.delete('/api/session', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Signed in as USER0001')

    await user.click(screen.getByRole('button', { name: 'Sign Off' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
