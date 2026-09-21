import { test, expect } from '@playwright/test'
import { signOnAsUser, xsrfHeaders } from '../fixtures/auth'
import { BILL_PAYMENT_ACCOUNT_ID, BILL_PAYMENT_ACCOUNT_ID_ZERO_BAL_SOURCE } from '../data/constants'

/**
 * Bill Payment (COBIL00C). Covers STORY-035..038, VR-095..VR-097, BR-011, BR-012.
 *
 * These tests mutate BILL_PAYMENT_ACCOUNT_ID's balance (BR-012: a payment always pays the
 * full balance and zeroes it) and restore it via a direct API call in an `afterEach` so the
 * suite is re-runnable and other specs that read this account are not affected.
 *
 * All backend calls use `page.request` (not the bare `request` fixture) so they share the
 * signed-in session cookies from `signOnAsUser` above; the bare `request` fixture is an
 * unauthenticated context and would 401 on every call.
 */
test.describe('Bill Payment (COBIL00C)', () => {
  let originalFields: Record<string, unknown> | null = null

  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    const account = await (await page.request.get(`/api/accounts/${BILL_PAYMENT_ACCOUNT_ID}`)).json()
    originalFields = account.fields
    await page.goto('/bill-payment')
  })

  test.afterEach(async ({ page }) => {
    if (!originalFields) return
    const current = await (await page.request.get(`/api/accounts/${BILL_PAYMENT_ACCOUNT_ID}`)).json()
    if (JSON.stringify(current.fields) !== JSON.stringify(originalFields)) {
      await page.request.put(`/api/accounts/${BILL_PAYMENT_ACCOUNT_ID}`, {
        headers: await xsrfHeaders(page),
        data: { expected: current.fields, updated: originalFields },
      })
    }
    originalFields = null
  })

  test('VR-095: a blank Account ID is rejected with the exact legacy message', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Acct ID can NOT be empty...')
  })

  test('STORY-035: user looks up an account balance for payment', async ({ page }) => {
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('bill-payment-balance')).toBeVisible()
  })

  test('STORY-037 / VR-097: payment is blocked until the user explicitly confirms', async ({ page }) => {
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.getByTestId('bill-pay-form').getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByText('Confirm to make a bill payment...')).toBeVisible()
  })

  test('VR-096: an invalid confirm value is rejected', async ({ page }) => {
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#confirm').fill('X')
    await page.getByTestId('bill-pay-form').getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      'Invalid value. Valid values are (Y/N)...',
    )
  })

  test('N clears the whole screen back to a blank Account ID prompt (not treated as an error)', async ({ page }) => {
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#confirm').fill('N')
    await page.getByTestId('bill-pay-form').getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('bill-payment-balance')).not.toBeVisible()
    await expect(page.getByTestId('bill-pay-form')).not.toBeVisible()
    await expect(page.locator('#accountId')).toHaveValue('')
    await expect(page.getByRole('status')).not.toBeVisible()
  })

  test('STORY-036 / BR-011 / BR-012: confirming Y pays the full balance and zeroes the account', async ({
    page,
  }) => {
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#confirm').fill('Y')
    await page.getByTestId('bill-pay-form').getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('status')).toHaveText('Payment successful.')

    const after = await (await page.request.get(`/api/accounts/${BILL_PAYMENT_ACCOUNT_ID}`)).json()
    expect(after.fields.currBal).toBe(0)
  })

  test('STORY-038 / BR-011: a zero-balance account reports nothing to pay', async ({ page }) => {
    // Uses a dedicated account whose seed balance is already 0.00 (see constants.ts), so this
    // scenario does not depend on STORY-036 having run first within the same suite.
    await page.locator('#accountId').fill(BILL_PAYMENT_ACCOUNT_ID_ZERO_BAL_SOURCE)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('bill-payment-balance')).toContainText('0')
    await page.locator('#confirm').fill('Y')
    await page.getByTestId('bill-pay-form').getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('status')).toHaveText('You have nothing to pay...')
  })
})
