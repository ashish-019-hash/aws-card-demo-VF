import { HttpResponse, http } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../server'
import { AuthContext } from '../../auth/AuthContext'
import { MenuPage } from '../../pages/MenuPage'

function renderMenu(admin: boolean) {
  const signOut = vi.fn(async () => {})
  render(
    <MemoryRouter initialEntries={[admin ? '/admin' : '/menu']}>
      <AuthContext.Provider
        value={{
          session: { authenticated: true, userId: 'X', firstName: null, lastName: null, userType: admin ? 'A' : 'U' },
          loading: false,
          signIn: async () => {
            throw new Error('not used')
          },
          signOut,
          isAdmin: admin,
          unauthorizedMessage: null,
        }}
      >
        <Routes>
          <Route path="/menu" element={<MenuPage admin={false} />} />
          <Route path="/admin" element={<MenuPage admin={true} />} />
          <Route path="/signon" element={<div>Sign On Screen</div>} />
          <Route path="/accounts/view" element={<div>Account View Screen</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { signOut }
}

describe('MenuPage (COMEN01C / COADM01C)', () => {
  it('renders the regular-user screen id/title and the numbered options from the backend', async () => {
    server.use(
      http.get('/api/menu', () =>
        HttpResponse.json({
          userType: 'U',
          options: [
            { number: 1, label: 'Account View', targetScreen: 'COACTVWC' },
            { number: 10, label: 'Bill Payment', targetScreen: 'COBIL00C' },
          ],
        }),
      ),
    )
    renderMenu(false)

    expect(screen.getByText('COMEN01C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Main Menu' })).toBeInTheDocument()
    expect(await screen.findByText(/1\. Account View/)).toBeInTheDocument()
    expect(screen.getByText(/10\. Bill Payment/)).toBeInTheDocument()
  })

  it('renders the admin screen id/title (COADM01C) with its own option set', async () => {
    server.use(
      http.get('/api/menu', () =>
        HttpResponse.json({
          userType: 'A',
          options: [{ number: 1, label: 'List Users', targetScreen: 'COUSR00C' }],
        }),
      ),
    )
    renderMenu(true)

    expect(screen.getByText('COADM01C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Admin Menu' })).toBeInTheDocument()
    expect(await screen.findByText(/1\. List Users/)).toBeInTheDocument()
  })

  it('shows an error message when the menu options fail to load', async () => {
    server.use(http.get('/api/menu', () => HttpResponse.json({ code: 'ERROR', message: 'boom' }, { status: 500 })))
    renderMenu(false)

    expect(await screen.findByText('Unable to load menu options.')).toBeInTheDocument()
  })

  it('navigates to the mapped route (menuRoutes.ts) when an option is selected', async () => {
    server.use(
      http.get('/api/menu', () =>
        HttpResponse.json({
          userType: 'U',
          options: [{ number: 1, label: 'Account View', targetScreen: 'COACTVWC' }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderMenu(false)

    await user.click(await screen.findByRole('link', { name: /Account View/ }))
    expect(await screen.findByText('Account View Screen')).toBeInTheDocument()
  })

  it('F3 = Sign Off signs the user out and navigates back to /signon', async () => {
    server.use(http.get('/api/menu', () => HttpResponse.json({ userType: 'U', options: [] })))
    const user = userEvent.setup()
    const { signOut } = renderMenu(false)

    await user.click(screen.getByRole('button', { name: 'F3 = Sign Off' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Sign On Screen')).toBeInTheDocument()
  })
})
