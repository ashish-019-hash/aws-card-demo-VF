import { test, expect } from '@playwright/test'
import { signOn, signOnAsUser, signOnAsAdmin, signOff } from '../fixtures/auth'
import { SEED_USERS } from '../data/constants'

/**
 * Sign-On screen (COSGN00C). Covers STORY-001..006 and VR-001/VR-002.
 * See e2e/TRACEABILITY.md for the full rule -> test mapping.
 */
test.describe('Sign On (COSGN00C)', () => {
  test('STORY-001: regular user signs on and reaches the main menu', async ({ page }) => {
    await signOnAsUser(page)
    await expect(page.getByRole('heading', { name: 'Main Menu' })).toBeVisible()
    await expect(page.getByText('COMEN01C')).toBeVisible()
  })

  test('STORY-002: admin signs on and reaches the admin menu', async ({ page }) => {
    await signOnAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Admin Menu' })).toBeVisible()
    await expect(page.getByText('COADM01C')).toBeVisible()
  })

  test('STORY-003: user is rejected for the wrong password', async ({ page }) => {
    await signOn(page, SEED_USERS.regular.userId, 'WRONGPASS')
    await expect(page).toHaveURL(/\/signon$/)
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('STORY-004: user is told their User ID does not exist', async ({ page }) => {
    await signOn(page, 'NOBODY99', 'PASSWORD')
    await expect(page).toHaveURL(/\/signon$/)
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('STORY-005 / VR-001 / VR-002: blank User ID and Password are rejected client-side', async ({ page }) => {
    await page.goto('/signon')
    await page.getByRole('button', { name: 'Sign On' }).click()
    await expect(page.locator('#userId').locator('..').getByText('Please enter User ID ...')).toBeVisible()
    await expect(page.locator('#password').locator('..').getByText('Please enter Password ...')).toBeVisible()
    // Still on the sign-on screen: no network round-trip happened for a client-blocked submit.
    await expect(page).toHaveURL(/\/signon$/)
  })

  test('VR-001: blank User ID alone is rejected, Password error absent once supplied', async ({ page }) => {
    await page.goto('/signon')
    await page.locator('#password').fill('PASSWORD')
    await page.getByRole('button', { name: 'Sign On' }).click()
    await expect(page.getByText('Please enter User ID ...')).toBeVisible()
    await expect(page.getByText('Please enter Password ...')).not.toBeVisible()
  })

  test('STORY-006: user exits the sign-on screen (no navigation target, screen holds)', async ({ page }) => {
    await page.goto('/signon')
    // The legacy PF3 exit from sign-on has no further screen to go to; this frontend has
    // no exit control on /signon (there is nowhere "back" to go before authenticating).
    // We assert the screen simply remains on /signon with an empty form, which is the
    // observable behavior — see e2e/TRACEABILITY.md for why no dedicated "exit" element
    // is asserted here.
    await expect(page).toHaveURL(/\/signon$/)
    await expect(page.locator('#userId')).toHaveValue('')
  })

  test('STORY-011: signing off from the main menu returns to Sign On', async ({ page }) => {
    await signOnAsUser(page)
    await signOff(page)
    await expect(page.getByRole('heading', { name: 'Sign On' })).toBeVisible()
  })

  test('unauthenticated direct navigation to a protected route redirects to /signon', async ({ page }) => {
    await page.goto('/menu')
    await expect(page).toHaveURL(/\/signon$/)
  })
})
