import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, onUnauthorized } from './client'
import { server } from '../test/server'

afterEach(() => {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0'
})

describe('api client CSRF handling', () => {
  it('echoes the XSRF-TOKEN cookie back as X-XSRF-TOKEN on mutating requests', async () => {
    document.cookie = 'XSRF-TOKEN=test-token-123'
    let capturedHeader: string | null = null

    server.use(
      http.post('/api/things', ({ request }) => {
        capturedHeader = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ ok: true })
      }),
    )

    await api.post('/api/things', { hello: 'world' })
    expect(capturedHeader).toBe('test-token-123')
  })

  it('does not send X-XSRF-TOKEN on GET requests', async () => {
    document.cookie = 'XSRF-TOKEN=test-token-123'
    let capturedHeader: string | null | undefined

    server.use(
      http.get('/api/things', ({ request }) => {
        capturedHeader = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ ok: true })
      }),
    )

    await api.get('/api/things')
    expect(capturedHeader).toBeNull()
  })
})

describe('api client error handling', () => {
  it('throws ApiError with status/code/message on a non-2xx response', async () => {
    server.use(
      http.get('/api/boom', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Nope' }, { status: 404 }),
      ),
    )

    await expect(api.get('/api/boom')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: 'Nope',
    })
  })

  it('exposes field errors via ApiError.fieldError()', async () => {
    server.use(
      http.put('/api/validate-me', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            errors: [{ field: 'addrZip', rule: 'VR-039', message: 'Zip Code must be a 5 digit number' }],
          },
          { status: 400 },
        ),
      ),
    )

    try {
      await api.put('/api/validate-me', {})
      throw new Error('expected ApiError to be thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).fieldError('addrZip')).toBe('Zip Code must be a 5 digit number')
      expect((e as ApiError).fieldError('missing')).toBeUndefined()
    }
  })

  it('notifies onUnauthorized listeners and throws on a 401 response', async () => {
    server.use(
      http.get('/api/secret', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Session expired.' }, { status: 401 }),
      ),
    )

    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)
    try {
      await expect(api.get('/api/secret')).rejects.toMatchObject({ status: 401 })
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })
})
