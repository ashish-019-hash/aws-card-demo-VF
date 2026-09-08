import { expect, test } from '../support/fixtures'

test.describe('sign-on and navigation', () => {
  test('requires both credentials and rejects invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('User ID is required.')).toBeVisible()

    await page.getByLabel('User ID').fill('USER0001')
    await page.getByLabel('Password').fill('WRONG123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('WRONG_PASSWORD: Wrong Password. Try again ...')
    await expect(page).toHaveURL(/sign-in/)
  })

  test('routes a standard user to standard workflows and signs out', async ({ page, signInAsStandardUser }) => {
    await signInAsStandardUser()
    await expect(page.getByText('Signed in as')).toContainText('USER0001')
    await expect(page.getByRole('link', { name: 'Account lookup' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome to CardDemo' })).toBeVisible()
  })

  test('routes an administrator to the security administration menu', async ({ page, signInAsAdministrator }) => {
    await signInAsAdministrator()
    await expect(page.getByText('Security administrator')).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Users' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Account lookup' })).toHaveCount(0)
  })
})
