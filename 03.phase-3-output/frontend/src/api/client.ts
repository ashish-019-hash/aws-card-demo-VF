import type { ApiErrorBody, ApiFieldError } from './types'

// Base URL: relative "/api" by default so the Vite dev-server proxy (see vite.config.ts)
// keeps requests same-origin (cookies work without extra CORS ceremony). Setting
// VITE_API_BASE_URL points the client straight at a backend origin instead (e.g. when the
// dev server proxy isn't available, such as in some preview setups).
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: ApiFieldError[]

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.errors = body.errors ?? []
  }

  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message
  }
}

/** Read a cookie value by name (used to echo XSRF-TOKEN back in the request header). */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Registered by the auth context so a 401 anywhere triggers a redirect to sign-on. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

const MUTATING_METHODS: HttpMethod[] = ['POST', 'PUT', 'DELETE']

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (MUTATING_METHODS.includes(method)) {
    const csrfToken = readCookie('XSRF-TOKEN')
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    unauthorizedListeners.forEach((listener) => listener())
    const errorBody = await safeJson(response)
    throw new ApiError(401, errorBody ?? { code: 'UNAUTHORIZED', message: 'Session expired.' })
  }

  if (!response.ok) {
    const errorBody = await safeJson(response)
    throw new ApiError(response.status, errorBody ?? { code: 'ERROR', message: response.statusText })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

async function safeJson(response: Response): Promise<ApiErrorBody | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
