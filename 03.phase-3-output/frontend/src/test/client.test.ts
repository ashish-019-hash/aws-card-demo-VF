import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError, clearCsrfHeaderToken, post, setCsrfHeaderToken } from '../api/client'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
afterEach(() => {
  clearCsrfHeaderToken()
  vi.restoreAllMocks()
})

describe('CSRF mutation handling', () => {
  it('does not prefetch CSRF for sign-in, then bootstraps it for an authenticated mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { userId: 'USER0001', role: 'USER' }))
      .mockResolvedValueOnce(json(200, { token: 'authenticated-token' }))
      .mockResolvedValueOnce(json(200, { changed: true }))
    vi.stubGlobal('fetch', fetchMock)

    await post('/api/session', { userId: 'USER0001', password: 'USER123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/session')
    expect(fetchMock.mock.calls[0][1].headers.get('X-XSRF-TOKEN')).toBeNull()

    await post('/api/example', { example: true })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/csrf')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/example')
    expect(fetchMock.mock.calls[2][1].headers.get('X-XSRF-TOKEN')).toBe('authenticated-token')
  })

  it('gets a CSRF token before a mutation and sends it in the header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { token: 'fresh-token' }))
      .mockResolvedValueOnce(json(200, { changed: true }))
    vi.stubGlobal('fetch', fetchMock)
    await post('/api/example', { example: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/csrf')
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('fresh-token')
  })

  it('does not retry an authorization 403 as a CSRF recovery', async () => {
    setCsrfHeaderToken('valid-token')
    const fetchMock = vi.fn().mockResolvedValue(json(403, { code: 'FORBIDDEN', message: 'Not authorized.' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(post('/api/example', {})).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes the token and retries one rejected CSRF mutation', async () => {
    setCsrfHeaderToken('stale-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(403, { code: 'CSRF_INVALID', message: 'expired token' }))
      .mockResolvedValueOnce(json(200, { token: 'recovered-token' }))
      .mockResolvedValueOnce(json(200, { changed: true }))
    vi.stubGlobal('fetch', fetchMock)
    await post('/api/example', {})
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][1].headers.get('X-XSRF-TOKEN')).toBe('recovered-token')
  })

  it('signals session recovery on a 401', async () => {
    const handler = vi.fn()
    window.addEventListener('carddemo:unauthenticated', handler)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { code: 'UNAUTHENTICATED', message: 'Sign in required' })),
    )
    await expect(post('/api/example', {})).rejects.toBeInstanceOf(HttpError)
    expect(handler).toHaveBeenCalledOnce()
    window.removeEventListener('carddemo:unauthenticated', handler)
  })
})
