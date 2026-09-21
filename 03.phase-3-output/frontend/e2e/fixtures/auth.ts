import { expect, type Page } from '@playwright/test'
import { SEED_USERS } from '../data/constants'

/**
 * Signs on through the real Sign-On screen (COSGN00C / STORY-001, STORY-002), exactly
 * as a user would: fill User ID + Password, click "Sign On". This exercises the same
 * UI + POST /api/session flow used by every other test, so the sign-on screen itself is
 * always covered even when this helper is reused for setup in other specs.
 */
export async function signOn(page: Page, userId: string, password: string): Promise<void> {
  await page.goto('/signon')
  await expect(page.getByRole('heading', { name: 'Sign On' })).toBeVisible()
  await page.locator('#userId').fill(userId)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign On' }).click()
}

/** STORY-001: regular user signs on and lands on /menu. */
export async function signOnAsUser(page: Page): Promise<void> {
  await signOn(page, SEED_USERS.regular.userId, SEED_USERS.regular.password)
  await expect(page).toHaveURL(/\/menu$/)
}

/** STORY-002: admin signs on and lands on /admin. */
export async function signOnAsAdmin(page: Page): Promise<void> {
  await signOn(page, SEED_USERS.admin.userId, SEED_USERS.admin.password)
  await expect(page).toHaveURL(/\/admin$/)
}

/** STORY-011: sign off / F3 from a menu returns to /signon. */
export async function signOff(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'F3 = Sign Off' }).click()
  await expect(page).toHaveURL(/\/signon$/)
}

/**
 * Header set required on mutating (PUT/POST/DELETE) `page.request.*` calls made directly
 * from a test (bypassing the UI). `page.request` shares the signed-in session cookies with
 * the browser context, but — unlike the app's own `api/client.ts` fetch wrapper — it does
 * NOT automatically echo the XSRF-TOKEN cookie back as an `X-XSRF-TOKEN` header, so the
 * backend's CSRF filter rejects it with 403. Without this header, a "simulate another user's
 * edit" `page.request.put(...)` call in a test silently 403s (Playwright doesn't throw on a
 * non-2xx response unless you check `.ok()`), so the record never actually changes.
 */
export async function xsrfHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies()
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value
  return token ? { 'X-XSRF-TOKEN': token } : {}
}
