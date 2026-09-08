import { request } from '@playwright/test'
import { assertDestructiveRunIsAllowed, assertSeededBackendReady } from './support/backend-readiness'

export default async function globalSetup() {
  assertDestructiveRunIsAllowed()
  const api = await request.newContext({
    baseURL: process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080',
  })

  try {
    await assertSeededBackendReady(api)
  } finally {
    await api.dispose()
  }
}
