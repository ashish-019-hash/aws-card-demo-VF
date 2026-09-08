import { expect, test } from '../support/fixtures'
import { currentYear, uniqueUserId } from '../support/test-data'

test.describe('administrator user maintenance', () => {
  test('creates, updates, and deletes a security user through explicit workflows', async ({
    page,
    signInAsAdministrator,
  }) => {
    const userId = uniqueUserId()
    await signInAsAdministrator()

    await page.getByRole('link', { name: 'Add user' }).click()
    await page.getByLabel('User ID').fill(userId)
    await page.getByLabel('First name').fill('E2E')
    await page.getByLabel('Last name').fill('Tester')
    await page.getByLabel('Password').fill('TEST123')
    await page.getByLabel('User type').fill('U')
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByText(`User ${userId} was created.`)).toBeVisible()

    await page.goto(`/users/update?id=${userId}`)
    await expect(page.getByLabel('First name')).toHaveValue('E2E')
    await page.getByLabel('First name').fill('Browser')
    await page.getByLabel('Password').fill('TEST124')
    await page.getByRole('button', { name: 'Save user' }).click()
    await expect(page.getByText(`User ${userId} was updated.`)).toBeVisible()

    await page.goto(`/users/delete?id=${userId}`)
    await expect(page.getByRole('heading', { name: 'Delete security user' })).toBeVisible()
    await expect(page.getByLabel('First name')).toHaveValue('Browser')
    await expect(page.getByLabel('Last name')).toHaveValue('Tester')
    await page.getByRole('button', { name: 'Delete user' }).click()
    await expect(page.getByRole('status')).toHaveText(`User ${userId} has been deleted.`)

    await page.goto('/users')
    await page.getByLabel('User ID starts with').fill(userId)
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('No users match the supplied filter.')).toBeVisible()
  })

  test('does not create a duplicate security user', async ({ page, signInAsAdministrator }) => {
    await signInAsAdministrator()
    await page.goto('/users/new')
    await page.getByLabel('User ID').fill('ADMIN001')
    await page.getByLabel('First name').fill('Duplicate')
    await page.getByLabel('Last name').fill('User')
    await page.getByLabel('Password').fill('ADMIN123')
    await page.getByLabel('User type').fill('A')
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByText(/duplicate|already exists/i)).toBeVisible()
  })
})

test.describe('reports and payment confirmation', () => {
  test('requires report confirmation, then submits a yearly report with the current-year period', async ({
    page,
    signInAsStandardUser,
  }) => {
    await signInAsStandardUser()
    await page.goto('/reports')
    await page.getByRole('button', { name: 'Submit report request' }).click()
    await expect(page.getByText('Enter Y to submit the report request.')).toBeVisible()

    await page.getByLabel('Report type').selectOption('YEARLY')
    await page.getByLabel('Confirm (Y)').fill('Y')
    await page.getByRole('button', { name: 'Submit report request' }).click()
    await expect(page.getByRole('heading', { name: /Report \d+: SUBMITTED/ })).toBeVisible()
    await expect(page.getByText(`YEARLY · ${currentYear}-01-01 to ${currentYear}-12-31`)).toBeVisible()
  })

  test('validates payment confirmation before a state-changing request', async ({ page, signInAsStandardUser }) => {
    await signInAsStandardUser()
    await page.goto('/payments')
    await page.getByLabel('Account ID').fill('1')
    await page.getByRole('button', { name: 'Submit payment' }).click()
    await expect(page.getByText('Enter Y to confirm the bill payment.')).toBeVisible()
  })
})
