import type { ApiError } from './types'

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])
let csrfHeaderToken: string | undefined
let csrfTokenGeneration = 0

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message)
  }
}

/** Spring returns a masked request token from /api/csrf; mutations use this value. */
export function setCsrfHeaderToken(token: string | undefined) {
  csrfHeaderToken = token
  if (token) csrfTokenGeneration += 1
}

export function clearCsrfHeaderToken() {
  csrfHeaderToken = undefined
}

async function fetchCsrfToken() {
  const response = await fetch(`${baseUrl}/api/csrf`, { credentials: 'include' })
  const body = (await response.json().catch(() => undefined)) as { token?: string } | undefined
  if (!response.ok || !body?.token) {
    throw unauthenticated(
      new HttpError(response.status, {
        code: 'CSRF_UNAVAILABLE',
        message: 'Unable to establish a secure request token.',
      }),
    )
  }
  setCsrfHeaderToken(body.token)
}

function unauthenticated(error: HttpError) {
  if (error.status === 401) window.dispatchEvent(new Event('carddemo:unauthenticated'))
  return error
}

function isCsrfFailure(error: HttpError) {
  return error.status === 403 && /csrf|token/i.test(`${error.body.code} ${error.body.message}`)
}

async function send<T>(path: string, init: RequestInit, csrfAttemptGeneration?: number): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!safeMethods.has(method) && csrfHeaderToken) headers.set('X-XSRF-TOKEN', csrfHeaderToken)

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T
  const body = (await response
    .json()
    .catch(() => ({ code: 'INVALID_RESPONSE', message: 'The service returned an unreadable response.' }))) as ApiError
  if (response.ok) return body as T

  const error = unauthenticated(new HttpError(response.status, body))
  // A 403 is retried only when the server identifies it as CSRF and only once per token generation.
  // Authorization 403 responses are surfaced directly and are never retried.
  if (
    !safeMethods.has(method) &&
    csrfAttemptGeneration !== undefined &&
    csrfAttemptGeneration === csrfTokenGeneration &&
    isCsrfFailure(error)
  ) {
    await fetchCsrfToken()
    return send<T>(path, init)
  }
  throw error
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  // Sign-on establishes the session that /api/csrf needs; Spring explicitly exempts it.
  const requiresCsrf = !safeMethods.has(method) && path !== '/api/session'
  if (requiresCsrf && !csrfHeaderToken) await fetchCsrfToken()
  return send<T>(path, init, requiresCsrf ? csrfTokenGeneration : undefined)
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })
