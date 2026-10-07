import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider, useSession } from './useSession'

afterEach(cleanup)

function Probe() {
  const { session, signIn, signOut } = useSession()
  return (
    <div>
      <output>{session ? `${session.userId}:${session.userType}` : 'signed-out'}</output>
      <button type="button" onClick={() => signIn({ userId: 'USER0001', userType: 'U' })}>
        sign in
      </button>
      <button type="button" onClick={signOut}>
        sign out
      </button>
    </div>
  )
}

afterEach(() => window.sessionStorage.removeItem(SESSION_STORAGE_KEY))

describe('useSession', () => {
  it('signs in, mirrors to sessionStorage and signs out', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('signed-out')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    expect(screen.getByText('USER0001:U')).toBeInTheDocument()
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain('USER0001')

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
    expect(screen.getByText('signed-out')).toBeInTheDocument()
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('restores the session from sessionStorage on load', () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'ADMIN001', userType: 'A' }))
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('ADMIN001:A')).toBeInTheDocument()
  })
})
