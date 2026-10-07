export class ApiError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

interface ProblemDetail {
  title?: string
  detail?: string
  status?: number
}

let csrfHeader: { name: string; token: string } | null = null

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/**
 * Registers a listener invoked when a *protected* request is rejected with
 * 401, meaning the server session expired or was revoked. The CSRF cache is
 * already cleared when the listener runs, so clearing the frontend session in
 * the listener is enough to let the user sign in again. The 401 that the
 * login endpoint itself returns for bad credentials never fires this.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

const LOGIN_PATH = '/api/auth/login'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${API_BASE_URL}${path}`

async function readError(response: Response): Promise<ApiError> {
  let problem: ProblemDetail | undefined
  try {
    problem = (await response.json()) as ProblemDetail
  } catch {
    // Some Spring Security responses have an empty body.
  }

  const detail = problem?.detail
  const message = detail ?? problem?.title ?? `Request failed with status ${response.status}.`
  return new ApiError(message, response.status, detail)
}

/** Expired/revoked server session: drop cached CSRF state and tell the app. */
function notifyUnauthorized() {
  clearApiSession()
  for (const listener of [...unauthorizedListeners]) listener()
}

async function getCsrfHeader(): Promise<{ name: string; token: string }> {
  if (csrfHeader) return csrfHeader
  const response = await fetch(apiUrl('/api/auth/csrf'), { credentials: 'include' })
  if (!response.ok) {
    // The CSRF bootstrap is itself a protected request: a 401 here means the
    // server session is gone, exactly like a 401 from the guarded endpoint
    // the mutation was about to call.
    if (response.status === 401) notifyUnauthorized()
    throw await readError(response)
  }
  const value = (await response.json()) as { headerName: string; token: string }
  csrfHeader = { name: value.headerName, token: value.token }
  return csrfHeader
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== LOGIN_PATH) {
    const csrf = await getCsrfHeader()
    headers.set(csrf.name, csrf.token)
  }

  const response = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401 && path !== LOGIN_PATH) {
      // The server session is gone (expired, revoked, restarted). Drop the
      // cached CSRF token and tell the app so it clears the frontend session
      // and routes the user back to sign-in for reauthentication.
      notifyUnauthorized()
    }
    throw await readError(response)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function clearApiSession() {
  csrfHeader = null
}
