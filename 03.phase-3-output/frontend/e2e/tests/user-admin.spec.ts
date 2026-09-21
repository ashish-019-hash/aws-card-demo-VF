import { test, expect } from '@playwright/test'
import { signOnAsAdmin, xsrfHeaders } from '../fixtures/auth'
import { uniqueTestUserId } from '../data/constants'

/**
 * User List (COUSR00C), Add User (COUSR01C), Update User (COUSR02C), Delete User
 * (COUSR03C). Admin-only. Covers STORY-044..050, VR-115..VR-128, BR-016.
 *
 * Every test that creates a user cleans it up (deletes it) in `afterEach`, even if the
 * test body fails partway, so re-running the suite never collides on a duplicate User ID
 * (VR/BR-016 uniqueness).
 */
test.describe('User Admin (COUSR00C/01C/02C/03C)', () => {
  let createdUserId: string | null = null

  test.beforeEach(async ({ page }) => {
    await signOnAsAdmin(page)
  })

  test.afterEach(async ({ page }) => {
    // Use page.request (shares the signed-in session cookies from beforeEach), not the bare
    // `request` fixture, which is an unauthenticated context and would 401 on every call.
    if (createdUserId) {
      await page.request.delete(`/api/users/${createdUserId}`, { headers: await xsrfHeaders(page) }).catch(() => undefined)
      createdUserId = null
    }
  })

  test('STORY-044: admin browses the list of application users', async ({ page }) => {
    await page.goto('/users')
    const rows = page.getByTestId('user-list').locator('tbody tr')
    await expect(rows).toContainText(['ADMIN001'])
  })

  test('STORY-046 / VR-116..VR-120: required fields are all reported on an empty Add User submit', async ({ page }) => {
    await page.goto('/users/add')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.locator('#userId').locator('..').locator('.field-error')).toHaveText('User ID can NOT be empty...')
    await expect(page.locator('#firstName').locator('..').locator('.field-error')).toHaveText(
      'First Name can NOT be empty...',
    )
    await expect(page.locator('#lastName').locator('..').locator('.field-error')).toHaveText(
      'Last Name can NOT be empty...',
    )
    await expect(page.locator('#password').locator('..').locator('.field-error')).toHaveText(
      'Password can NOT be empty...',
    )
    await expect(page.locator('#userType').locator('..').locator('.field-error')).toHaveText(
      'User Type can NOT be empty...',
    )
  })

  test('User Type must be A or U', async ({ page }) => {
    await page.goto('/users/add')
    await page.locator('#userId').fill(uniqueTestUserId())
    await page.locator('#firstName').fill('Test')
    await page.locator('#lastName').fill('User')
    await page.locator('#password').fill('PASSWORD')
    await page.locator('#userType').fill('Z')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.locator('#userType').locator('..').locator('.field-error')).toHaveText('User Type must be A or U')
  })

  test('BR-016: adding a duplicate User ID is rejected', async ({ page }) => {
    await page.goto('/users/add')
    await page.locator('#userId').fill('ADMIN001')
    await page.locator('#firstName').fill('Dup')
    await page.locator('#lastName').fill('Licate')
    await page.locator('#password').fill('PASSWORD')
    await page.locator('#userType').fill('U')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByRole('alert')).toHaveText('User ID already exist...')
  })

  test('STORY-046/047/048/049/050: full user lifecycle — add, lookup, update, delete', async ({ page }) => {
    const userId = uniqueTestUserId()
    createdUserId = userId

    await page.goto('/users/add')
    await page.locator('#userId').fill(userId)
    await page.locator('#firstName').fill('Ephemeral')
    await page.locator('#lastName').fill('Tester')
    await page.locator('#password').fill('PASSWORD')
    await page.locator('#userType').fill('U')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('User has been added ...')).toBeVisible()
    await expect(page).toHaveURL(/\/users$/, { timeout: 5_000 })
    await expect(page.getByTestId('user-list')).toContainText(userId)

    // STORY-047/048: look the user up on Update User and change their profile.
    // The ?userId= query param only pre-fills the lookup field; Enter still has to be
    // clicked to actually perform the lookup and reveal the update form.
    await page.goto(`/users/update?userId=${userId}`)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#firstName')).toHaveValue('Ephemeral')
    await page.locator('#firstName').fill('Updated')
    await page.locator('#password').fill('NEWPASS1')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('User has been updated ...')).toBeVisible()

    // VR-123..VR-126: clearing First Name on a second update is rejected.
    await page.locator('#firstName').fill('')
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.locator('#firstName').locator('..').locator('.field-error')).toHaveText(
      'First Name can NOT be empty...',
    )

    // STORY-049/050: delete the user via Delete User (VR-127/128), then confirm removal.
    await page.goto(`/users/delete?userId=${userId}`)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('user-delete-detail')).toContainText(userId)
    await page.getByRole('button', { name: 'F5 = Delete' }).click()
    await expect(page.getByText('User has been deleted ...')).toBeVisible()
    createdUserId = null // already deleted through the UI; afterEach has nothing to clean up

    await page.goto('/users')
    await expect(page.getByTestId('user-list')).not.toContainText(userId)
  })

  test('VR-121/VR-127: a blank User ID on Update/Delete lookup is rejected', async ({ page }) => {
    await page.goto('/users/update')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('User ID can NOT be empty...')

    await page.goto('/users/delete')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('User ID can NOT be empty...')
  })

  test('a non-existent User ID on Update lookup is reported not found', async ({ page }) => {
    await page.goto('/users/update')
    await page.locator('#userId').fill('NOPE9999')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toHaveText('User ID NOT found...')
  })
})
