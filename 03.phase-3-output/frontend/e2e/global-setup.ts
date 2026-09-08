import { request } from '@playwright/test'
import { adminSession, resetTestDatabase } from './support/api'

export default async function globalSetup() {
  const api = await request.newContext({
    baseURL: process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080',
  })

  try {
    await resetTestDatabase(api)
    await adminSession(api)
  } finally {
    await api.dispose()
  }
}
