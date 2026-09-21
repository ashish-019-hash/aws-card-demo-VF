import { test, expect } from '@playwright/test'
import { signOnAsUser } from '../fixtures/auth'

/**
 * Transaction Report Request (CORPT00C). Covers STORY-039..043, VR-098/099/111/112/113/114,
 * BR-013.
 *
 * Note: VR-100..VR-110 (per-part month/day/year required + range checks) describe the
 * legacy screen's *separate* month/day/year input fields for the custom date range. This
 * frontend instead uses a single `YYYY-MM-DD` text field per date (like every other date
 * field in the app), validated by the same dateFormat/validCalendarDate helpers used
 * elsewhere (VR-089/VR-091-style), not three discrete numeric fields. VR-100..VR-110 are
 * therefore N/A to this UI by design — see e2e/TRACEABILITY.md.
 */
test.describe('Transaction Report Request (CORPT00C)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/reports')
  })

  test('VR-098: a report type must be selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByText('Select a report type to print report...')).toBeVisible()
  })

  test('STORY-039 / BR-013: Monthly report needs no date range and validates straight to confirm', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByText('Report request validated. Set Confirm to Y and press Enter to submit.')).toBeVisible()
  })

  test('STORY-040 / BR-013: Yearly report needs no date range and validates straight to confirm', async ({ page }) => {
    await page.getByLabel('Yearly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByText('Report request validated. Set Confirm to Y and press Enter to submit.')).toBeVisible()
  })

  test('STORY-041: Custom report requires Start Date and End Date', async ({ page }) => {
    await page.getByLabel('Custom').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#startDate').locator('..').locator('.field-error')).toHaveText(
      'Start Date can NOT be empty...',
    )
    await expect(page.locator('#endDate').locator('..').locator('.field-error')).toHaveText('End Date can NOT be empty...')
  })

  test('VR-099/dateFormat: Custom report start date must be YYYY-MM-DD', async ({ page }) => {
    await page.getByLabel('Custom').check()
    await page.locator('#startDate').fill('2024/01/01')
    await page.locator('#endDate').fill('2024-01-31')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#startDate').locator('..').locator('.field-error')).toHaveText(
      'Start Date should be in format YYYY-MM-DD',
    )
  })

  test('VR-111: Custom report start date must be a real calendar date', async ({ page }) => {
    await page.getByLabel('Custom').check()
    await page.locator('#startDate').fill('2024-02-30')
    await page.locator('#endDate').fill('2024-03-01')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#startDate').locator('..').locator('.field-error')).toHaveText(
      'Start Date - Not a valid date...',
    )
  })

  test('VR-112: Custom report end date must be a real calendar date', async ({ page }) => {
    await page.getByLabel('Custom').check()
    await page.locator('#startDate').fill('2024-01-01')
    await page.locator('#endDate').fill('2024-04-31')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#endDate').locator('..').locator('.field-error')).toHaveText('End Date - Not a valid date...')
  })

  test('STORY-041: a fully valid custom date range validates to the confirm step', async ({ page }) => {
    await page.getByLabel('Custom').check()
    await page.locator('#startDate').fill('2024-01-01')
    await page.locator('#endDate').fill('2024-01-31')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByText('Report request validated. Set Confirm to Y and press Enter to submit.')).toBeVisible()
  })

  test('STORY-042 / VR-113: user must confirm before the report job is submitted', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText('Confirm to print the report...')
  })

  test('VR-114: an invalid confirm value is rejected', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.locator('#confirm').fill('X')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      'Invalid value. Valid values are (Y/N)...',
    )
  })

  test('STORY-043: a confirmed report request is submitted as a background job', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.locator('#confirm').fill('Y')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.getByRole('status')).toBeVisible()
  })

  // DEFECT-002 (see e2e/DEFECTS.md): VR-113/VR-114 mandate
  // "Please confirm to print the <report> report..." (report name interpolated) and
  // "<value>" is not a valid value to confirm...' (entered value interpolated). The app
  // instead shows the generic "Confirm to print the report..." / "Invalid value. Valid
  // values are (Y/N)..." messages (shared verbatim with the bill-payment/transaction-add
  // confirm gates). Marked as an expected failure per task instructions.
  test.fail('VR-113 (DEFECT-002): blank confirm message does not match the legacy wording', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      'Please confirm to print the MONTHLY report...',
    )
  })

  test.fail('VR-114 (DEFECT-002): invalid confirm message does not match the legacy wording', async ({ page }) => {
    await page.getByLabel('Monthly').check()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.locator('#confirm').fill('X')
    await page.getByRole('button', { name: 'Enter (confirm)' }).click()
    await expect(page.locator('#confirm').locator('..').locator('.field-error')).toHaveText(
      '"X" is not a valid value to confirm...',
    )
  })
})
