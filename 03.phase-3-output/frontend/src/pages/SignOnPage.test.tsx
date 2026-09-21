import { HttpResponse, http } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { AuthProvider } from '../auth/AuthContext'
import { SignOnPage } from './SignOnPage'

function renderSignOnPage() {
  return render(
    <MemoryRouter initialEntries={['/signon']}>
      <AuthProvider>
        <Routes>
          <Route path="/signon" element={<SignOnPage />} />
          <Route path="/menu" element={<div>Main Menu Screen</div>} />
          <Route path="/admin" element={<div>Admin Menu Screen</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('SignOnPage', () => {
  it('shows client-side validation errors when User ID / Password are blank (VR-001/VR-002)', async () => {
    server.use(http.get('/api/session', () => HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null })))
    const user = userEvent.setup()
    renderSignOnPage()

    await user.click(await screen.findByRole('button', { name: 'Sign On' }))

    expect(await screen.findByText('Please enter User ID ...')).toBeInTheDocument()
    expect(screen.getByText('Please enter Password ...')).toBeInTheDocument()
  })

  it('navigates to /menu for a regular user on success', async () => {
    server.use(
      http.get('/api/session', () => HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null })),
      http.post('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'USER0001', firstName: 'Reg', lastName: 'User', userType: 'U' }),
      ),
    )
    const user = userEvent.setup()
    renderSignOnPage()

    await user.type(await screen.findByLabelText('User ID'), 'USER0001')
    await user.type(screen.getByLabelText('Password'), 'PASSWORD')
    await user.click(screen.getByRole('button', { name: 'Sign On' }))

    expect(await screen.findByText('Main Menu Screen')).toBeInTheDocument()
  })

  it('navigates to /admin for an admin user on success', async () => {
    server.use(
      http.get('/api/session', () => HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null })),
      http.post('/api/session', () =>
        HttpResponse.json({ authenticated: true, userId: 'ADMIN001', firstName: 'Ad', lastName: 'Min', userType: 'A' }),
      ),
    )
    const user = userEvent.setup()
    renderSignOnPage()

    await user.type(await screen.findByLabelText('User ID'), 'ADMIN001')
    await user.type(screen.getByLabelText('Password'), 'PASSWORD')
    await user.click(screen.getByRole('button', { name: 'Sign On' }))

    expect(await screen.findByText('Admin Menu Screen')).toBeInTheDocument()
  })

  it('shows the backend error message on bad credentials', async () => {
    server.use(
      http.get('/api/session', () => HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null })),
      http.post('/api/session', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'User not found. Try again ...' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    renderSignOnPage()

    await user.type(await screen.findByLabelText('User ID'), 'NOBODY01')
    await user.type(screen.getByLabelText('Password'), 'WRONGPW')
    await user.click(screen.getByRole('button', { name: 'Sign On' }))

    expect(await screen.findByText('User not found. Try again ...')).toBeInTheDocument()
  })

  it('shows the session-expired message passed via navigation state', async () => {
    server.use(http.get('/api/session', () => HttpResponse.json({ authenticated: false, userId: null, firstName: null, lastName: null, userType: null })))
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/signon', state: { message: 'Your session has expired. Please sign on again.' } }]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/signon" element={<SignOnPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Your session has expired. Please sign on again.')).toBeInTheDocument()
    })
  })
})
