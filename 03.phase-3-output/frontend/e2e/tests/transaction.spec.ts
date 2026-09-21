import { test, expect } from '@playwright/test'
import { signOnAsUser } from '../fixtures/auth'
import { KNOWN_TRANSACTION_ID, TRANSACTION_SOURCE_CARD_NUM } from '../data/constants'

/**
 * Transaction List (COTRN00C), Transaction View (COTRN01C), Transaction Add (COTRN02C).
 * Covers STORY-027..034, VR-069..VR-094, BR-010.
 */

test.describe('Transaction List (COTRN00C)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/transactions')
  })

  test('STORY-027: user browses the transaction log in pages', async ({ page }) => {
    const rows = page.getByTestId('transaction-list').locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    await page.getByRole('button', { name: 'F8 = Next Page' }).click()
    await expect(rows.first()).toBeVisible()
  })

  test('STORY-028: user jumps directly to a transaction ID from the list screen', async ({ page }) => {
    await page.locator('#startId').fill(KNOWN_TRANSACTION_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('transaction-list')).toContainText(KNOWN_TRANSACTION_ID)
  })

  test('VR-070: a non-numeric jump-to Tran ID is rejected', async ({ page }) => {
    await page.locator('#startId').fill('abc123')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Tran ID must be Numeric ...')
  })

  test('STORY-029: user selects a transaction row to view its detail', async ({ page }) => {
    await page.getByRole('link', { name: 'S = View' }).first().click()
    await expect(page).toHaveURL(/\/transactions\/view\?tranId=/)
    await expect(page.getByTestId('transaction-detail')).toBeVisible()
  })
})

test.describe('Transaction View (COTRN01C)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/transactions/view')
  })

  test('STORY-030: user looks up a transaction by ID and sees its full detail', async ({ page }) => {
    await page.locator('#tranId').fill(KNOWN_TRANSACTION_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('transaction-detail')).toContainText(KNOWN_TRANSACTION_ID)
  })

  test('VR-071: a blank Tran ID is rejected with the exact legacy message', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Tran ID can NOT be empty...')
  })

  test('a non-existent Tran ID is reported as not found', async ({ page }) => {
    await page.locator('#tranId').fill('9999999999999999')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
})

test.describe('Transaction Add (COTRN02C)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/transactions/add')
  })

  function validTransactionForm() {
    return {
      typeCd: '01',
      catCd: '1',
      source: 'POS',
      description: 'E2E test purchase',
      amount: '12.34',
      origDate: '2024-01-15',
      procDate: '2024-01-15',
      merchantId: '123456',
      merchantName: 'E2E Merchant',
      merchantCity: 'Testville',
      merchantZip: '99999',
    }
  }

  async function fillTransactionForm(page: import('@playwright/test').Page, values: Record<string, string>) {
    for (const [field, value] of Object.entries(values)) {
      await page.locator(`#${field}`).fill(value)
    }
  }

  test('VR-072/VR-074: account and card both blank is rejected', async ({ page }) => {
    await fillTransactionForm(page, validTransactionForm())
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByRole('alert').first()).toHaveText('Account or Card Number must be entered...')
  })

  test('VR-075..VR-085: required fields are all reported when the form is empty and a card is supplied', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#typeCd').locator('..').locator('.field-error')).toHaveText('Type CD can NOT be empty...')
    await expect(page.locator('#catCd').locator('..').locator('.field-error')).toHaveText('Category CD can NOT be empty...')
    await expect(page.locator('#source').locator('..').locator('.field-error')).toHaveText('Source can NOT be empty...')
    await expect(page.locator('#description').locator('..').locator('.field-error')).toHaveText(
      'Description can NOT be empty...',
    )
    await expect(page.locator('#amount').locator('..').locator('.field-error')).toHaveText('Amount can NOT be empty...')
    await expect(page.locator('#origDate').locator('..').locator('.field-error')).toHaveText('Orig Date can NOT be empty...')
    await expect(page.locator('#procDate').locator('..').locator('.field-error')).toHaveText('Proc Date can NOT be empty...')
    await expect(page.locator('#merchantId').locator('..').locator('.field-error')).toHaveText(
      'Merchant ID can NOT be empty...',
    )
    await expect(page.locator('#merchantName').locator('..').locator('.field-error')).toHaveText(
      'Merchant Name can NOT be empty...',
    )
    await expect(page.locator('#merchantCity').locator('..').locator('.field-error')).toHaveText(
      'Merchant City can NOT be empty...',
    )
    await expect(page.locator('#merchantZip').locator('..').locator('.field-error')).toHaveText(
      'Merchant Zip can NOT be empty...',
    )
  })

  test('VR-086: Type Code must be numeric', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.locator('#typeCd').fill('AB')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#typeCd').locator('..').locator('.field-error')).toHaveText('Type CD must be Numeric...')
  })

  test('VR-088: Amount must match -99999999.99 format', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.locator('#amount').fill('12.345')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#amount').locator('..').locator('.field-error')).toHaveText(
      'Amount should be in format -99999999.99',
    )
  })

  test('VR-089: Orig Date must match YYYY-MM-DD format', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.locator('#origDate').fill('01/15/2024')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#origDate').locator('..').locator('.field-error')).toHaveText(
      'Orig Date should be in format YYYY-MM-DD',
    )
  })

  test('VR-091: Orig Date must be a real calendar date', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.locator('#origDate').fill('2024-02-30')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#origDate').locator('..').locator('.field-error')).toHaveText(
      'Orig Date - Not a valid date...',
    )
  })

  test('VR-093: Merchant ID must be numeric', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.locator('#merchantId').fill('ABC')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#merchantId').locator('..').locator('.field-error')).toHaveText(
      'Merchant ID must be Numeric...',
    )
  })

  test('STORY-032: user copies the last transaction on a card as a starting point', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await page.getByRole('button', { name: 'F5 = Copy Last Transaction' }).click()
    await expect(page.getByText('Last transaction details copied.')).toBeVisible()
    await expect(page.locator('#merchantName')).not.toHaveValue('')
  })

  test('STORY-033/STORY-034/BR-010: a fully valid, confirmed transaction is added and gets a new sequential-style ID', async ({
    page,
  }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByText('Transaction validated. Set Confirm to Y and press Enter to add.')).toBeVisible()

    // VR-094: blank confirm blocks the add.
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      'Confirm to add this transaction...',
    )

    await page.locator('#confirm').fill('N')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    // Scoped to the status message bar: the earlier blank-confirm field-error span (also
    // "Confirm to add this transaction...") is still in the DOM, so an unscoped getByText
    // would match both and violate strict mode.
    await expect(page.getByRole('status')).toHaveText('Confirm to add this transaction...')

    await page.locator('#confirm').fill('Y')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.getByText(/Transaction added, ID \d+\./)).toBeVisible()
  })

  test('VR-094: an invalid confirm value is rejected', async ({ page }) => {
    await page.locator('#cardNum').fill(TRANSACTION_SOURCE_CARD_NUM)
    await fillTransactionForm(page, validTransactionForm())
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.locator('#confirm').fill('X')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      'Invalid value. Valid values are (Y/N)...',
    )
  })
})
