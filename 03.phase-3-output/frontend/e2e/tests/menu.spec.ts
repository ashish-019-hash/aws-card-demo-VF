import { test, expect } from '@playwright/test'
import { signOnAsUser, signOnAsAdmin } from '../fixtures/auth'

/**
 * Main Menu (COMEN01C) / Admin Menu (COADM01C). Covers STORY-007..011, BR-002, BR-003.
 * VR-003/VR-004 (menu option number validation) are N/A here — see e2e/TRACEABILITY.md:
 * the frontend menu is a list of links (GET /api/menu, role-scoped by the backend), not
 * a typed numeric-option BMS field, so there is no "invalid option number" input to test.
 */
test.describe('Menu navigation (COMEN01C / COADM01C)', () => {
  test('STORY-007: regular user navigates the main menu to a business function', async ({ page }) => {
    await signOnAsUser(page)
    await page.getByRole('link', { name: /Account View/ }).click()
    await expect(page).toHaveURL(/\/accounts\/view$/)
    await expect(page.getByText('COACTVWC')).toBeVisible()
  })

  test('BR-002: regular user only sees regular-user menu options (no Security/user-admin options)', async ({ page }) => {
    await signOnAsUser(page)
    const menu = page.locator('ul.menu-list')
    await expect(menu.getByText('Account View')).toBeVisible()
    await expect(menu.getByText(/Security/)).toHaveCount(0)
  })

  test('STORY-010 / BR-002: admin navigates the admin menu to a user-management function', async ({ page }) => {
    await signOnAsAdmin(page)
    await page.getByRole('link', { name: /User List/ }).click()
    await expect(page).toHaveURL(/\/users$/)
    await expect(page.getByText('COUSR00C')).toBeVisible()
  })

  test('BR-003 / STORY-009: a regular user is blocked from an admin-only screen via direct URL', async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/users')
    await expect(page.getByRole('alert')).toHaveText('No access - Admin Only option.')
    await expect(page.getByText('COUSR00C')).toBeVisible()
  })

  test('BR-003: all four user-admin routes are blocked for a regular user via direct URL', async ({ page }) => {
    await signOnAsUser(page)
    for (const route of ['/users', '/users/add', '/users/update', '/users/delete']) {
      await page.goto(route)
      await expect(page.getByRole('alert')).toHaveText('No access - Admin Only option.')
    }
  })

  test('an authenticated admin can still reach every regular-user screen directly (no ownership scoping, BR-005 context)', async ({ page }) => {
    await signOnAsAdmin(page)
    await page.goto('/accounts/view')
    await expect(page.getByText('COACTVWC')).toBeVisible()
    // Admin is not blocked by AdminGate on regular-user screens (they aren't wrapped in it).
    await expect(page.getByRole('alert')).not.toBeVisible()
  })
})
