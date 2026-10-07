import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, clearApiSession } from '../services/api/client'
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

afterEach(() => {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  vi.unstubAllGlobals()
  clearApiSession()
})

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

describe('SessionProvider expired-session recovery', () => {
  it('clears the frontend session when a protected request returns 401', async () => {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'USER0001', userType: 'U' }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('USER0001:U')).toBeInTheDocument()

    await act(async () => {
      await expect(apiRequest('/api/accounts/1')).rejects.toMatchObject({ status: 401 })
    })

    // The session and its storage mirror are gone, so RequireSession can
    // route the user back to sign-in for reauthentication.
    expect(screen.getByText('signed-out')).toBeInTheDocument()
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('keeps the session when the login endpoint itself returns 401', async () => {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'USER0001', userType: 'U' }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )

    await act(async () => {
      await expect(
        apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ userId: 'OTHER', password: 'bad' }),
        }),
      ).rejects.toMatchObject({ status: 401 })
    })

    expect(screen.getByText('USER0001:U')).toBeInTheDocument()
  })
})
