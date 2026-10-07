import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, clearApiSession, onUnauthorized } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  clearApiSession()
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('apiRequest', () => {
  it('sends credentials and parses JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'USER0001' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ id: string }>('/api/users/USER0001')).resolves.toEqual({ id: 'USER0001' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/USER0001',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('fetches and sends a CSRF token for mutations', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'USER0001' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/users/USER0001', { method: 'PUT', body: JSON.stringify({ firstName: 'Alex' }) })

    const mutationInit = fetchMock.mock.calls[1][1] as RequestInit
    expect((mutationInit.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token')
    expect((mutationInit.headers as Headers).get('Content-Type')).toBe('application/json')
  })
})

describe('expired-session recovery', () => {
  it('clears the CSRF cache and notifies listeners when a protected request returns 401', async () => {
    const expired = vi.fn()
    const unsubscribe = onUnauthorized(expired)
    const fetchMock = vi
      .fn()
      // First mutation: CSRF fetch, then a 401 from the expired server session.
      .mockResolvedValueOnce(jsonResponse({ headerName: 'X-XSRF-TOKEN', token: 'stale-token' }))
      .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized' }, 401))
      // Retry after reauthentication: the CSRF token must be re-fetched.
      .mockResolvedValueOnce(jsonResponse({ headerName: 'X-XSRF-TOKEN', token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'USER0001' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/api/users/USER0001', { method: 'PUT', body: JSON.stringify({ firstName: 'Alex' }) }),
    ).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledTimes(1)

    await apiRequest('/api/users/USER0001', { method: 'PUT', body: JSON.stringify({ firstName: 'Alex' }) })
    // The stale cached token was dropped: call 3 re-fetched /api/auth/csrf.
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/csrf')
    const retryInit = fetchMock.mock.calls[3][1] as RequestInit
    expect((retryInit.headers as Headers).get('X-XSRF-TOKEN')).toBe('fresh-token')
    unsubscribe()
  })

  it('does not treat a bad-credentials 401 from the login endpoint as an expired session', async () => {
    const expired = vi.fn()
    const unsubscribe = onUnauthorized(expired)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Wrong password. Try again.' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId: 'USER0001', password: 'nope' }),
      }),
    ).rejects.toMatchObject({ status: 401 })
    expect(expired).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('treats a 401 from the CSRF bootstrap itself as an expired session', async () => {
    const expired = vi.fn()
    const unsubscribe = onUnauthorized(expired)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ title: 'Unauthorized' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    // The mutation never reaches its own endpoint: the CSRF bootstrap is
    // rejected first, which must clear state and notify just like a 401 from
    // the protected endpoint would.
    await expect(
      apiRequest('/api/users/USER0001', { method: 'PUT', body: JSON.stringify({ firstName: 'Alex' }) }),
    ).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf')

    // After reauthentication the next mutation fetches a fresh token.
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ headerName: 'X-XSRF-TOKEN', token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'USER0001' }))
    await apiRequest('/api/users/USER0001', { method: 'PUT', body: JSON.stringify({ firstName: 'Alex' }) })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/csrf')
    unsubscribe()
  })

  it('stops notifying after a listener unsubscribes', async () => {
    const expired = vi.fn()
    const unsubscribe = onUnauthorized(expired)
    unsubscribe()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))

    await expect(apiRequest('/api/users/USER0001')).rejects.toMatchObject({ status: 401 })
    expect(expired).not.toHaveBeenCalled()
  })
})
