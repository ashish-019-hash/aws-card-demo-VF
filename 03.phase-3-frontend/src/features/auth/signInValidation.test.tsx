import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import SignInPage from '../../pages/SignInPage'
import { api } from '../../services/api'

vi.mock('../../services/api', () => ({
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
afterEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
})

function renderSignIn() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/sign-in']}>
        <SignInPage />
      </MemoryRouter>
    </SessionProvider>,
  )
}

/** Step 4 — field-level sign-on validation (RULE-VAL-001/002). */
describe('SignInPage validation', () => {
  it('RULE-VAL-001/002 — empty credentials show the legacy prompts and skip the API', async () => {
    renderSignIn()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Please enter User ID ...')).toBeInTheDocument()
    expect(screen.getByText('Please enter Password ...')).toBeInTheDocument()
    expect(screen.getByLabelText(/User ID/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('aria-invalid', 'true')
    expect(api.auth.login).not.toHaveBeenCalled()
  })

  it('RULE-VAL-002 — a user ID without a password only flags the password', async () => {
    renderSignIn()
    await userEvent.type(screen.getByLabelText(/User ID/), 'USER0001')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Please enter Password ...')).toBeInTheDocument()
    expect(screen.queryByText('Please enter User ID ...')).not.toBeInTheDocument()
    expect(api.auth.login).not.toHaveBeenCalled()
  })
})
