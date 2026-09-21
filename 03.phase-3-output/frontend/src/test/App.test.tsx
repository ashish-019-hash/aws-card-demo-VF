import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { server } from './server'
import App from '../App'

/**
 * App.tsx wires BrowserRouter directly (not injectable), so these integration tests
 * drive real window.history navigation before each render to land on a given path, per
 * screen-flow.md's route table (mirrored in src/pages/menuRoutes.ts's SCREEN_ROUTES).
 */
function visit(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

function mockSession(authenticated: boolean, userType: 'A' | 'U' = 'U') {
  server.use(
    http.get('/api/session', () =>
      HttpResponse.json(
        authenticated
          ? { authenticated: true, userId: 'USER0001', firstName: 'Test', lastName: 'User', userType }
          : { authenticated: false, userId: null, firstName: null, lastName: null, userType: null },
      ),
    ),
  )
}

describe('App routing/gating (App.tsx)', () => {
  it('redirects to the sign-on screen when a protected route is visited without a session', async () => {
    mockSession(false)
    visit('/cards')
    expect(await screen.findByRole('heading', { name: 'Sign On' })).toBeInTheDocument()
  })

  it.each([
    ['/menu', 'Main Menu'],
    ['/accounts/view', 'View Account'],
    ['/accounts/update', 'Update Account'],
    ['/cards', 'List Credit Cards'],
    ['/transactions', 'List Transactions'],
    ['/reports', 'Transaction Report'],
    ['/bill-payment', 'Bill Payment'],
  ])('an authenticated regular user visiting %s reaches the "%s" screen', async (path, heading) => {
    mockSession(true, 'U')
    server.use(
      http.get('/api/menu', () => HttpResponse.json({ userType: 'U', options: [] })),
      http.get('/api/cards', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })),
      http.get('/api/transactions', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })),
    )
    visit(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it.each(['/users', '/users/add', '/users/update', '/users/delete'])(
    'blocks a regular (non-admin) user from %s with the legacy 403 message',
    async (path) => {
      mockSession(true, 'U')
      visit(path)
      expect(await screen.findByText('No access - Admin Only option.')).toBeInTheDocument()
    },
  )

  it.each([
    ['/users', 'List Users'],
    ['/users/add', 'Add User'],
    ['/users/update', 'Update User'],
    ['/users/delete', 'Delete User'],
  ])('allows an admin user through the AdminGate to reach %s ("%s")', async (path, heading) => {
    mockSession(true, 'A')
    server.use(http.get('/api/users', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    visit(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByText('No access - Admin Only option.')).not.toBeInTheDocument()
  })

  it('redirects an unknown path to the sign-on screen', async () => {
    mockSession(false)
    visit('/this-route-does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Sign On' })).toBeInTheDocument()
  })

  it('redirects the root path to the sign-on screen', async () => {
    mockSession(false)
    visit('/')
    expect(await screen.findByRole('heading', { name: 'Sign On' })).toBeInTheDocument()
  })

  it('redirects an admin user visiting /menu straight to the Admin Menu', async () => {
    mockSession(true, 'A')
    server.use(http.get('/api/menu', () => HttpResponse.json({ userType: 'A', options: [] })))
    visit('/menu')
    expect(await screen.findByRole('heading', { name: 'Admin Menu' })).toBeInTheDocument()
  })

  it('redirects a regular user visiting /admin straight to the Main Menu', async () => {
    mockSession(true, 'U')
    server.use(http.get('/api/menu', () => HttpResponse.json({ userType: 'U', options: [] })))
    visit('/admin')
    expect(await screen.findByRole('heading', { name: 'Main Menu' })).toBeInTheDocument()
  })
})
