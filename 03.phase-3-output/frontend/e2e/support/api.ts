import { expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080'

type ResetResponse = { changed?: boolean }

/**
 * The test command owns its data lifecycle. Start Spring Boot with
 * `--carddemo.database.reset=true`, which reloads immutable legacy extracts once.
 * Resetting every test via public business APIs would create stateful dependencies;
 * the suite instead uses unique users and one-time payment coverage.
 */
export async function resetTestDatabase(api: APIRequestContext) {
  const probe = await api.get('/v3/api-docs')
  expect(probe.ok(), 'Spring Boot backend must be running before Playwright starts').toBeTruthy()
}

export async function signIn(api: APIRequestContext, userId: string, password: string) {
  const response = await api.post('/api/session', { data: { userId, password } })
  expect(response.ok(), `sign-on failed for ${userId}: ${await response.text()}`).toBeTruthy()
  const csrf = await api.get('/api/csrf')
  expect(csrf.ok(), 'CSRF token request must succeed after sign-on').toBeTruthy()
  return (await csrf.json()) as { token: string }
}

export async function adminSession(api: APIRequestContext) {
  return signIn(api, 'ADMIN001', 'ADMIN123')
}

export async function apiMutation<T = unknown>(
  api: APIRequestContext,
  method: 'post' | 'put' | 'delete',
  path: string,
  data?: unknown,
): Promise<T | undefined> {
  const csrf = await api.get('/api/csrf')
  const token = ((await csrf.json()) as { token: string }).token
  const response = await api[method](path, {
    data,
    headers: { 'X-XSRF-TOKEN': token },
  })
  expect(response.ok(), `${method.toUpperCase()} ${path} failed: ${await response.text()}`).toBeTruthy()
  if (response.status() === 204) return undefined
  return (await response.json()) as T
}

export async function updateSeedCardName(api: APIRequestContext, cardNumber: string, name: string) {
  const response = await api.get(`/api/cards/${cardNumber}`)
  expect(response.ok()).toBeTruthy()
  const card = (await response.json()) as {
    embossedName: string
    activeStatus: string
    expirationDate: string
    version: number
  }
  return apiMutation<ResetResponse>(api, 'put', `/api/cards/${cardNumber}`, {
    embossedName: name,
    activeStatus: card.activeStatus,
    expirationDate: card.expirationDate,
    expectedVersion: card.version,
  })
}

export { API_URL }
