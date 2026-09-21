import { test, expect } from '@playwright/test'
import { signOnAsUser, xsrfHeaders } from '../fixtures/auth'
import { READONLY_ACCOUNT_ID, READONLY_ACCOUNT_CARD_NUM, READONLY_ACCOUNT_ID_2, MUTABLE_CARD_NUM } from '../data/constants'

/**
 * Card List (COCRDLIC), Card Search/Detail (COCRDSLC), Card Update (COCRDUPC).
 * Covers STORY-020..026, VR-054..VR-068, BR-014, BR-015.
 */

test.describe('Card List (COCRDLIC)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/cards')
  })

  test('STORY-020 / BR-015: user browses the full list of credit cards with a fixed page size', async ({ page }) => {
    const rows = page.getByTestId('card-list').locator('tbody tr')
    await expect(rows).toHaveCount(7)
  })

  test('STORY-020: F8 = Next Page / F7 = Prev Page paginate the list', async ({ page }) => {
    const firstCardCell = page.getByTestId('card-list').locator('tbody tr').first().locator('td').first()
    const firstPageFirstCard = await firstCardCell.textContent()
    await page.getByRole('button', { name: 'F8 = Next Page' }).click()
    await expect(firstCardCell).not.toHaveText(firstPageFirstCard ?? '')
    const secondPageFirstCard = await firstCardCell.textContent()
    await page.getByRole('button', { name: 'F7 = Prev Page' }).click()
    await expect(firstCardCell).not.toHaveText(secondPageFirstCard ?? '')
    await expect(firstCardCell).toHaveText(firstPageFirstCard ?? '')
  })

  test('STORY-021 / BR-014: user filters the card list by account number', async ({ page }) => {
    await page.locator('#acctFilter').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    const rows = page.getByTestId('card-list').locator('tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(READONLY_ACCOUNT_ID)
  })

  test('VR-054: a non-numeric account filter is rejected', async ({ page }) => {
    await page.locator('#acctFilter').fill('abc')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#acctFilter').locator('..').locator('.field-error')).toHaveText(
      'ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER',
    )
  })

  test('VR-055: a card filter that is not exactly 16 digits is rejected', async ({ page }) => {
    await page.locator('#cardFilter').fill('12345')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#cardFilter').locator('..').locator('.field-error')).toHaveText(
      'CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER',
    )
  })

  test('STORY-022: user selects a card from the list to view its detail', async ({ page }) => {
    await page.locator('#acctFilter').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    // Wait for the list to actually re-render down to the single filtered row before clicking
    // "View" — otherwise the click can land while the previous (unfiltered, 7-row) list is
    // still on screen, and `getByRole('link', { name: 'View' })` resolves to multiple elements.
    await expect(page.getByTestId('card-list').locator('tbody tr')).toHaveCount(1)
    await page.getByRole('link', { name: 'View' }).click()
    await expect(page).toHaveURL(/\/cards\/view\?cardNum=/)
    await expect(page.getByTestId('card-detail')).toBeVisible()
  })

  test('a filter matching nothing shows "No matching cards found."', async ({ page }) => {
    await page.locator('#acctFilter').fill(READONLY_ACCOUNT_ID_2)
    await page.locator('#cardFilter').fill('9999999999999999')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toHaveText('No matching cards found.')
  })
})

test.describe('Card View (COCRDSLC)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/cards/view')
  })

  test('STORY-023: user looks up a specific card by card number', async ({ page }) => {
    await page.locator('#cardFilter').fill(READONLY_ACCOUNT_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('card-detail')).toContainText(READONLY_ACCOUNT_CARD_NUM)
  })

  test('an account-or-card filter is required when both are blank', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toHaveText('Account ID or Card Number must be entered...')
  })

  test('VR-059: a non-16-digit card filter is rejected', async ({ page }) => {
    await page.locator('#cardFilter').fill('123')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#cardFilter').locator('..').locator('.field-error')).toHaveText(
      'CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER',
    )
  })
})

test.describe('Card Update (COCRDUPC)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/cards/update')
  })

  test('VR-062: a blank card number on search is rejected', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Card number not provided')
  })

  test('STORY-024: user searches for a card to prepare an update', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#embossedName')).toBeVisible()
  })

  test('VR-064: embossed name must be supplied', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#embossedName').fill('')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#embossedName').locator('..').locator('.field-error')).toHaveText(
      'Card name not provided',
    )
  })

  test('VR-065: embossed name must be alphabetic', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#embossedName').fill('Carter7')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#embossedName').locator('..').locator('.field-error')).toHaveText(
      'Card name can only contain alphabets and spaces',
    )
  })

  test('VR-066: card active status must be Y or N', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#activeStatus').fill('Z')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#activeStatus').locator('..').locator('.field-error')).toHaveText(
      'Card Active Status must be Y or N',
    )
  })

  test('VR-067: expiry month 0 is rejected (out of 1-12 range)', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#expiryMonth').fill('0')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#expiryMonth').locator('..').locator('.field-error')).toHaveText(
      'Card expiry month must be between 1 and 12',
    )
  })

  test('VR-067: expiry month 13 is rejected (out of 1-12 range)', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#expiryMonth').fill('13')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#expiryMonth').locator('..').locator('.field-error')).toHaveText(
      'Card expiry month must be between 1 and 12',
    )
  })

  test('VR-067: expiry month boundaries 1 and 12 are accepted', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#expiryMonth').fill('1')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#expiryMonth').locator('..').locator('.field-error')).toHaveCount(0)
  })

  test('VR-068: expiry year 1949 is rejected (below 1950-2099 range)', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#expiryYear').fill('1949')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#expiryYear').locator('..').locator('.field-error')).toHaveText('Invalid card expiry year')
  })

  test('VR-068: expiry year 2100 is rejected (above 1950-2099 range)', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#expiryYear').fill('2100')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#expiryYear').locator('..').locator('.field-error')).toHaveText('Invalid card expiry year')
  })

  test('STORY-025 / STORY-026: user edits, confirms, saves a card update, then restores it', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    const originalName = await page.locator('#embossedName').inputValue()

    await page.locator('#embossedName').fill('Carter Test Veum')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByRole('status')).toHaveText('Changes validated.Press F5 to save')
    await expect(page.getByTestId('confirm-actions')).toBeVisible()

    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('Changes committed to database')).toBeVisible()

    // Restore the original name so the suite is re-runnable.
    await page.locator('#embossedName').fill(originalName)
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('Changes committed to database')).toBeVisible()
    await expect(page.locator('#embossedName')).toHaveValue(originalName)
  })

  test('STORY-026 / BR-009: saving with a stale card snapshot is rejected as a 409 conflict', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    const originalName = await page.locator('#embossedName').inputValue()

    const current = await (await page.request.get(`/api/cards/${MUTABLE_CARD_NUM}`)).json()
    await page.request.put(`/api/cards/${MUTABLE_CARD_NUM}`, {
      headers: await xsrfHeaders(page),
      data: { expected: current.fields, updated: { ...current.fields, embossedName: 'Concurrent Editor' } },
    })

    await page.locator('#embossedName').fill('My Local Edit')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    const after = await (await page.request.get(`/api/cards/${MUTABLE_CARD_NUM}`)).json()
    await page.request.put(`/api/cards/${MUTABLE_CARD_NUM}`, {
      headers: await xsrfHeaders(page),
      data: { expected: after.fields, updated: { ...after.fields, embossedName: originalName } },
    })
  })

  // Resolved (see e2e/DEFECTS.md #1): the backend's ConflictException now carries the exact
  // legacy text ("Record changed by some one else. Please review") for card save conflicts,
  // and the frontend surfaces it verbatim via e2.message.
  test('STORY-026: the conflict alert shows the exact legacy conflict message', async ({ page }) => {
    await page.locator('#cardNum').fill(MUTABLE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter' }).click()
    const originalName = await page.locator('#embossedName').inputValue()

    const current = await (await page.request.get(`/api/cards/${MUTABLE_CARD_NUM}`)).json()
    await page.request.put(`/api/cards/${MUTABLE_CARD_NUM}`, {
      headers: await xsrfHeaders(page),
      data: { expected: current.fields, updated: { ...current.fields, embossedName: 'Concurrent Editor' } },
    })

    await page.locator('#embossedName').fill('My Local Edit')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    try {
      await expect(page.getByRole('alert')).toHaveText('Record changed by some one else. Please review')
    } finally {
      const after = await (await page.request.get(`/api/cards/${MUTABLE_CARD_NUM}`)).json()
      await page.request.put(`/api/cards/${MUTABLE_CARD_NUM}`, {
        headers: await xsrfHeaders(page),
        data: { expected: after.fields, updated: { ...after.fields, embossedName: originalName } },
      })
    }
  })
})
