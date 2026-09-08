import { expect, type APIRequestContext } from '@playwright/test'
import { seeded } from './test-data'

const apiBaseURL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080'
const freshBoundary = process.env.E2E_RESET_BOUNDARY === 'fresh-container'
const allowExistingBackend = process.env.E2E_ALLOW_EXISTING_BACKEND === 'true'
const allowRemoteDestructiveRun = process.env.E2E_ALLOW_REMOTE_DESTRUCTIVE_RUN === 'true'

function isLoopbackTarget(url: URL) {
  return (
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '[::1]'
  )
}

/**
 * The suite creates durable users, transactions, and report requests. It only runs
 * by default against a runner-owned fresh local backend; any exception is explicit.
 */
export function assertDestructiveRunIsAllowed() {
  const target = new URL(apiBaseURL)
  if (!isLoopbackTarget(target) && !allowRemoteDestructiveRun) {
    throw new Error(
      `Refusing destructive E2E run against ${target.origin}. Set E2E_ALLOW_REMOTE_DESTRUCTIVE_RUN=true only for an approved disposable environment.`,
    )
  }
  if (!freshBoundary && !allowExistingBackend) {
    throw new Error(
      'A fresh database boundary is required for destructive E2E tests. Run `npm run e2e:local`, or set E2E_ALLOW_EXISTING_BACKEND=true only for a disposable manually reset backend.',
    )
  }
}

/** Verifies both backend reachability and the immutable seeded records required by the browser specs. */
export async function assertSeededBackendReady(api: APIRequestContext) {
  const session = await api.post('/api/session', { data: seeded.standardUser })
  expect(session.ok(), `seeded standard-user sign-on failed: ${await session.text()}`).toBeTruthy()

  const account = await api.get(`/api/accounts/${seeded.account.id}`)
  expect(account.ok(), `seeded account ${seeded.account.id} is unavailable: ${await account.text()}`).toBeTruthy()
  const seededAccount = (await account.json()) as { accountId: number; cards: Array<{ cardNumber: string }> }
  expect(seededAccount.accountId).toBe(Number(seeded.account.id))
  expect(seededAccount.cards.some((card) => card.cardNumber === seeded.account.cardNumber)).toBeTruthy()
}
