import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { AdminGate } from './AdminGate'

function renderWithAuth(isAdmin: boolean) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          session: { authenticated: true, userId: 'X', firstName: null, lastName: null, userType: isAdmin ? 'A' : 'U' },
          loading: false,
          signIn: async () => {
            throw new Error('not used')
          },
          signOut: async () => {},
          isAdmin,
        }}
      >
        <AdminGate screenId="COUSR00C" title="List Users">
          <div>Protected admin content</div>
        </AdminGate>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AdminGate', () => {
  it('blocks a non-admin user with the legacy 403 message, without rendering children', () => {
    renderWithAuth(false)
    expect(screen.getByText('No access - Admin Only option.')).toBeInTheDocument()
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
  })

  it('renders children for an admin user', () => {
    renderWithAuth(true)
    expect(screen.getByText('Protected admin content')).toBeInTheDocument()
    expect(screen.queryByText('No access - Admin Only option.')).not.toBeInTheDocument()
  })
})
