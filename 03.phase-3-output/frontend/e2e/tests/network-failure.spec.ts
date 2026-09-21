import { test, expect } from '@playwright/test'
import { signOnAsUser } from '../fixtures/auth'
import { READONLY_ACCOUNT_ID } from '../data/constants'

/**
 * Explicit network-failure scenarios. These are the ONLY tests in the suite that mock a
 * network response — every other spec talks to the real backend. Covers generic error
 * handling that isn't a specific STORY/VR/BR id: the frontend must degrade gracefully
 * when the backend is unreachable or returns a 401 mid-session.
 */
test.describe('Network failure handling (mocked backend responses)', () => {
  test('a network failure while loading account details shows a fallback error message', async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/accounts/view')
    await page.route('**/api/accounts/**', (route) => route.abort('failed'))
    await page.locator('#acctId').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toHaveText('Unable to look up account.')
  })

  // DEFECT-004 (see e2e/DEFECTS.md): the redirect to /signon itself works (security
  // behavior is intact), but the explanatory "session expired" message is lost to a race
  // between AuthContext's state-carrying `navigate()` call and RequireAuth's own
  // (state-less) `<Navigate>` re-render, so no message is shown. Marked as an expected
  // failure per task instructions (do not weaken the assertion, do not fix production code
  // from a test file).
  test.fail('a 401 response mid-session redirects back to Sign On with an expiry message (DEFECT-004)', async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/accounts/view')
    await page.route('**/api/accounts/**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Session expired.' }) }),
    )
    await page.locator('#acctId').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page).toHaveURL(/\/signon$/)
    await expect(page.getByRole('alert')).toHaveText('Your session has expired. Please sign on again.')
  })

  test('a 401 response mid-session redirects back to Sign On (the redirect itself works; see DEFECT-004 for the lost message)', async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/accounts/view')
    await page.route('**/api/accounts/**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Session expired.' }) }),
    )
    await page.locator('#acctId').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page).toHaveURL(/\/signon$/)
  })

  test('a 500 response while loading the card list shows a fallback error message', async ({ page }) => {
    await signOnAsUser(page)
    await page.route('**/api/cards**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'ERROR', message: 'Internal error' }) }),
    )
    await page.goto('/cards')
    await expect(page.getByRole('alert')).toHaveText('Internal error')
  })
})
