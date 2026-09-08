import { test, expect } from '../support/fixtures'
import { seeded } from '../support/test-data'

test.describe('account and card servicing', () => {
  test('looks up an account with customer and linked-card details', async ({ page, signInAsStandardUser }) => {
    await signInAsStandardUser()
    await page.getByRole('link', { name: 'Account lookup' }).click()
    await page.getByLabel('Account ID').fill(seeded.account.id)
    await page.getByRole('button', { name: 'Find account' }).click()

    await expect(page.getByRole('heading', { name: `Account ${seeded.account.id}` })).toBeVisible()
    await expect(page.getByText('Immanuel Madeline Kessler')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Linked cards' })).toBeVisible()
    await expect(page.getByRole('link', { name: seeded.account.cardNumber })).toBeVisible()
  })

  test('keeps account lookup available after invalid and unknown identifiers', async ({
    page,
    signInAsStandardUser,
  }) => {
    await signInAsStandardUser()
    await page.goto('/accounts')
    await page.getByLabel('Account ID').fill('0')
    await page.getByRole('button', { name: 'Find account' }).click()
    await expect(page.getByText('Enter a non-zero numeric account ID of up to 11 digits.')).toBeVisible()

    await page.getByLabel('Account ID').fill('99999999999')
    await page.getByRole('button', { name: 'Find account' }).click()
    await expect(page.getByRole('alert')).toHaveText('ACCOUNT_NOT_FOUND: Account not found.')
    await expect(page.getByLabel('Account ID')).toHaveValue('99999999999')
  })

  test('browses, filters, views, and validates card maintenance', async ({ page, signInAsStandardUser }) => {
    await signInAsStandardUser()
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Cards' }).click()
    await expect(page.getByRole('heading', { name: 'Credit cards' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 1 of 5')
    await page.getByRole('navigation', { name: 'Pagination' }).getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 2 of 5')

    await page.getByLabel('Card number').fill('not-a-card')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'Account IDs must be numeric and card numbers must contain 16 digits.',
    )

    await page.getByLabel('Card number').fill(seeded.card.number)
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('link', { name: seeded.card.number })).toBeVisible()

    await page.getByRole('link', { name: seeded.card.number }).click()
    await expect(page.getByRole('heading', { name: 'Card details' })).toBeVisible()
    await expect(page.getByText('Cardholder')).toBeVisible()

    await page.getByRole('link', { name: 'Maintain this card' }).click()
    await expect(page.getByRole('heading', { name: 'Card maintenance' })).toBeVisible()
    await page.getByLabel('Cardholder name').fill('123')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText(/alphabetic cardholder name/i)).toBeVisible()
  })
})
