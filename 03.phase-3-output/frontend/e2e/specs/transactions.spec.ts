import { test, expect } from '../support/fixtures'
import { transactionInput } from '../support/test-data'

async function fillTransaction(page: import('@playwright/test').Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries({
    'Account ID': values.accountId,
    'Card number': values.cardNumber,
    'Type code': values.transactionTypeCode,
    'Category code': values.transactionCategoryCode,
    Source: values.source,
    Description: values.description,
    Amount: values.amount,
    'Origin date': values.originDate,
    'Processing date': values.processingDate,
    'Merchant ID': values.merchantId,
    'Merchant name': values.merchantName,
    'Merchant city': values.merchantCity,
    'Merchant ZIP': values.merchantZip,
    'Confirm (Y)': values.confirmation,
  })) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
}

test.describe('transaction inquiry and capture', () => {
  test('browses transactions, rejects a nonnumeric filter, and opens a selected detail', async ({
    page,
    signInAsStandardUser,
  }) => {
    await signInAsStandardUser()
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Transactions' })
      .click()
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    await page.getByLabel('Starting transaction ID').fill('not-a-number')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('Transaction ID must be numeric.')).toBeVisible()

    await page.getByLabel('Starting transaction ID').fill('')
    await page.getByRole('button', { name: 'Search' }).click()
    const firstTransaction = page.locator('tbody a').first()
    await expect(firstTransaction).toBeVisible()
    await firstTransaction.click()
    await expect(page.getByRole('heading', { name: 'Transaction details' })).toBeVisible()
    await expect(page.getByText('Merchant name')).toBeVisible()
  })

  test('requires a transaction ID for direct lookup', async ({ page, signInAsStandardUser }) => {
    await signInAsStandardUser()
    await page.goto('/transactions/detail')
    await page.getByRole('button', { name: 'Find transaction' }).click()
    await expect(page.getByText('Transaction ID can NOT be empty.')).toBeVisible()
  })

  test('rejects malformed transaction input before mutation and creates a confirmed valid transaction', async ({
    page,
    signInAsStandardUser,
  }) => {
    await signInAsStandardUser()
    await page.goto('/transactions/new')
    await fillTransaction(page, transactionInput({ amount: '12.50', confirmation: '' }))
    await page.getByRole('button', { name: 'Add confirmed transaction' }).click()
    await expect(page.getByText(/amount must use a sign/i)).toBeVisible()

    await page.getByLabel('Amount').fill('+12.50')
    await page.getByLabel('Confirm (Y)').fill('Y')
    await page.getByRole('button', { name: 'Add confirmed transaction' }).click()
    await expect(page.getByRole('status')).toHaveText(/ADDED: transaction \d+ was created/i)
  })
})
