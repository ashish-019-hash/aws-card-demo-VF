import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, clearApiSession } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  clearApiSession()
})

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
