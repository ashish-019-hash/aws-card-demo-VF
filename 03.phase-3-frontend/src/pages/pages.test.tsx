import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../hooks/useSession'
import { api } from '../services/api'
import type { Session } from '../types/session'
import AdminMenuPage from './AdminMenuPage'
import ExitPage from './ExitPage'
import MainMenuPage from './MainMenuPage'
import NotFoundPage from './NotFoundPage'
import SignInPage from './SignInPage'

vi.mock('../services/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    },
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

afterEach(cleanup)

function renderPage(ui: ReactNode, { session, path = '/' }: { session?: Session; path?: string } = {}) {
  if (session) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  }
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<div>other route</div>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

afterEach(() => window.sessionStorage.removeItem(SESSION_STORAGE_KEY))

describe('SignInPage', () => {
  it('renders the sign-on form with the legacy screen code', () => {
    renderPage(<SignInPage />, { path: '/sign-in' })
    expect(screen.getByRole('heading', { name: 'Sign on' })).toBeInTheDocument()
    expect(document.querySelector('[data-screen="COSGN00"]')).not.toBeNull()
    expect(screen.getByLabelText(/User ID/)).toHaveAttribute('maxlength', '8')
    expect(screen.getByRole('link', { name: 'Exit application' })).toHaveAttribute('href', '/exit')
  })

  it('signs in through the backend API and leaves the page', async () => {
    vi.mocked(api.auth.login).mockResolvedValue({ userId: 'ADMIN001', userType: 'A', entryPoint: 'ADMIN_MENU' })
    renderPage(<SignInPage />, { path: '/sign-in' })
    await userEvent.type(screen.getByLabelText(/User ID/), 'ADMIN001')
    await userEvent.type(screen.getByLabelText(/Password/), 'pass1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByText('other route')).toBeInTheDocument(), { timeout: 2000 })
    expect(api.auth.login).toHaveBeenCalledWith('ADMIN001', 'pass1234')
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain('"userType":"A"')
  })

  it('shows an API error message for an unknown user', async () => {
    vi.mocked(api.auth.login).mockRejectedValue(new Error('User not found. Try again.'))
    renderPage(<SignInPage />, { path: '/sign-in' })
    await userEvent.type(screen.getByLabelText(/User ID/), 'BADUSER1')
    await userEvent.type(screen.getByLabelText(/Password/), 'pass1234')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('User not found. Try again.'), {
      timeout: 2000,
    })
  })
})

describe('menu pages', () => {
  it('MainMenuPage renders the ten option tiles inside the shell', () => {
    renderPage(<MainMenuPage />, { session: { userId: 'USER0001', userType: 'U' }, path: '/menu' })
    expect(document.querySelector('[data-screen="COMEN01"]')).not.toBeNull()
    expect(screen.getAllByRole('link', { name: /^Option \d+:/ })).toHaveLength(10)
    expect(screen.getByRole('link', { name: 'Option 10: Bill Payment' })).toHaveAttribute('href', '/bill-payment')
  })

  it('AdminMenuPage renders the four admin tiles inside the shell', () => {
    renderPage(<AdminMenuPage />, { session: { userId: 'ADMIN001', userType: 'A' }, path: '/admin' })
    expect(document.querySelector('[data-screen="COADM01"]')).not.toBeNull()
    expect(screen.getAllByRole('link', { name: /^Option \d+:/ })).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Option 1: User List' })).toHaveAttribute('href', '/admin/users')
  })
})

describe('ExitPage and NotFoundPage', () => {
  it('ExitPage thanks the user and links back to sign-in', () => {
    renderPage(<ExitPage />, { path: '/exit' })
    expect(screen.getByRole('heading', { name: /Thank you for using CCDA application/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to sign-in' })).toHaveAttribute('href', '/sign-in')
  })

  it('NotFoundPage links back to the role home', () => {
    renderPage(<NotFoundPage />, { path: '/missing' })
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your menu' })).toHaveAttribute('href', '/')
  })
})
