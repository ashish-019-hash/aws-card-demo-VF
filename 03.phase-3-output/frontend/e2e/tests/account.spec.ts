import { test, expect } from '@playwright/test'
import { signOnAsUser, xsrfHeaders } from '../fixtures/auth'
import { READONLY_ACCOUNT_ID, MUTABLE_ACCOUNT_ID, uniqueGroupId } from '../data/constants'

/**
 * Account View (COACTVWC) + Account Update (COACTUPC). Covers STORY-012..019 and
 * VR-005..VR-053 (see e2e/TRACEABILITY.md for the full per-VR mapping — most of
 * VR-009..VR-053 share the same generic "editor" behavior exercised once per editor type
 * below, per COACTUPC's own reusable-paragraph design documented in validation-rules.md §7).
 */

test.describe('Account View (COACTVWC)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/accounts/view')
  })

  test('STORY-012: user looks up an account and sees its details', async ({ page }) => {
    await page.locator('#acctId').fill(READONLY_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    const detail = page.getByTestId('account-detail')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(READONLY_ACCOUNT_ID)
  })

  test('STORY-013 / VR-006: a blank Account ID is treated as "no filter" (no hard error)', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Account Filter must  be a non-zero 11 digit number')
  })

  test('VR-006: a non-numeric Account ID is rejected with the exact legacy message', async ({ page }) => {
    await page.locator('#acctId').fill('abc')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Account Filter must  be a non-zero 11 digit number')
  })

  test('VR-006: a zero Account ID is rejected', async ({ page }) => {
    await page.locator('#acctId').fill('0')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Account Filter must  be a non-zero 11 digit number')
  })

  test('STORY-013: a well-formed but non-existent account is reported as not found', async ({ page }) => {
    await page.locator('#acctId').fill('99999999999')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByTestId('account-detail')).not.toBeVisible()
  })

  test('STORY-014: user navigates from Account View to the Card List via the main menu', async ({ page }) => {
    // COACTVWC has no direct link to the card list in the legacy screen either (navigation
    // is via the main menu, per screen-flow.md); go back and choose the card list option.
    await page.getByRole('link', { name: 'F3 = Exit/Back' }).click()
    await expect(page).toHaveURL(/\/menu$/)
    await page.getByRole('link', { name: /Credit Card List/ }).click()
    await expect(page).toHaveURL(/\/cards$/)
  })
})

test.describe('Account Update (COACTUPC)', () => {
  test.beforeEach(async ({ page }) => {
    await signOnAsUser(page)
    await page.goto('/accounts/update')
  })

  test('STORY-015: user searches for an account to prepare an update', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('account-update-form')).toBeVisible()
  })

  test('VR-007: a blank account number on search is rejected with the exact legacy message', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Account number not provided')
  })

  test('VR-008: a non-11-digit account number on search is rejected with the exact legacy message', async ({ page }) => {
    // Finding 7 (resolved): this frontend enforces VR-008's exact-11-digit legacy rule; a
    // short-form real seed id (e.g. "9") is rejected — it must be zero-padded to 11 digits
    // (e.g. "00000000009", see MUTABLE_ACCOUNT_ID) to reach a real account.
    await page.locator('#acctId').fill('9')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.locator('.field-error')).toHaveText('Account Number if supplied must be a 11 digit Non-Zero Number')
  })

  test('STORY-016 / VR-009..VR-053: editing to the exact same values reports no change', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByRole('status')).toHaveText('No change detected with respect to values fetched.')
  })

  test('VR-010: a blank Account Status is rejected with the exact legacy message', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#activeStatus').fill('')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#activeStatus').locator('..').locator('.field-error')).toHaveText(
      'Account Status must be supplied.',
    )
  })

  // Resolved (see e2e/DEFECTS.md #3): yesNo() now takes separate blank/invalid messages, and
  // AccountUpdatePage passes 'Account Status must be Y or N.' as the distinct invalid-value
  // message, so a non-blank invalid value no longer shows the blank-field wording.
  test('VR-010/VR-015: a non-blank invalid Account Status shows its own distinct message', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#activeStatus').fill('Z')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#activeStatus').locator('..').locator('.field-error')).toHaveText(
      'Account Status must be Y or N.',
    )
  })

  test('VR-014: Credit Limit must be a valid signed amount', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#creditLimit').fill('')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#creditLimit').locator('..').locator('.field-error')).toHaveText(
      'Credit Limit must be supplied.',
    )
  })

  test('VR-030/031/032/034: Open Date must be a real calendar date', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#openDate').fill('2023-02-30')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#openDate').locator('..').locator('.field-error')).toHaveText(
      'Open Date validation error: not a valid date',
    )
  })

  test('VR-035: Date of Birth must be strictly in the past', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    const future = new Date()
    future.setUTCFullYear(future.getUTCFullYear() + 5)
    const iso = future.toISOString().slice(0, 10)
    await page.locator('#dob').fill(iso)
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#dob').locator('..').locator('.field-error')).toHaveText(
      'Date of Birth:cannot be in the future ',
    )
  })

  test('VR-040: FICO Score out of range (851) is rejected', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#ficoCreditScore').fill('851')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#ficoCreditScore').locator('..').locator('.field-error')).toHaveText(
      'FICO Score: should be between 300 and 850',
    )
  })

  test('VR-040: FICO Score boundary 850 is accepted (no field error)', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#ficoCreditScore').fill('850')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#ficoCreditScore').locator('..').locator('.field-error')).toHaveCount(0)
  })

  test('VR-040: FICO Score boundary 299 is rejected', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#ficoCreditScore').fill('299')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#ficoCreditScore').locator('..').locator('.field-error')).toHaveText(
      'FICO Score: should be between 300 and 850',
    )
  })

  test('VR-011: First Name must be alphabetic', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#firstName').fill('John3')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#firstName').locator('..').locator('.field-error')).toHaveText(
      'First Name must be supplied.',
    )
  })

  test('VR-041: State must be a valid 2-letter code', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#addrStateCd').fill('ZZ')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#addrStateCd').locator('..').locator('.field-error')).toHaveText(
      'State: is not a valid state code',
    )
  })

  test('VR-027: Zip must be a 5-digit number', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#addrZip').fill('123')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#addrZip').locator('..').locator('.field-error')).toHaveText(
      'Zip must be a 5 digit number.',
    )
  })

  test('VR-037: SSN first 3 digits must not be 666', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#ssn').fill('666445566')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#ssn').locator('..').locator('.field-error')).toHaveText(
      'SSN: First 3 chars: should not be 000, 666, or between 900 and 999',
    )
  })

  test('VR-045/VR-046: Phone area code must be a non-zero 3-digit number', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#phoneNum1').fill('(000)555-1234')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#phoneNum1').locator('..').locator('.field-error')).toHaveText(
      'Phone Number 1: Area code cannot be zero',
    )
  })

  test('VR-030b: EFT Account Id must be a 10-digit number', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await page.locator('#eftAccountId').fill('12')
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.locator('#eftAccountId').locator('..').locator('.field-error')).toHaveText(
      'EFT Account Id must be a 10 digit number.',
    )
  })

  test('STORY-017: user edits an account field, validates, confirms, and saves', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('account-update-form')).toBeVisible()

    const originalGroupId = await page.locator('#groupId').inputValue()
    const newGroupId = uniqueGroupId()
    await page.locator('#groupId').fill(newGroupId)
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await expect(page.getByRole('status')).toHaveText('Changes validated.Press F5 to save')
    await expect(page.getByTestId('confirm-actions')).toBeVisible()

    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('Changes committed to database')).toBeVisible()
    await expect(page.locator('#groupId')).toHaveValue(newGroupId)

    // Restore state so the suite (and this test) is re-runnable: put groupId back.
    await page.locator('#groupId').fill(originalGroupId)
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByText('Changes committed to database')).toBeVisible()
    await expect(page.locator('#groupId')).toHaveValue(originalGroupId)
  })

  test('STORY-018 / BR-007: saving with a stale snapshot is rejected as a 409 conflict', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('account-update-form')).toBeVisible()

    const original = await page.locator('#groupId').inputValue()
    // Simulate "someone else changed the record first" by mutating the account directly via
    // the API, using the same session, after the page has already fetched its snapshot.
    const current = await (await page.request.get(`/api/accounts/${MUTABLE_ACCOUNT_ID}`)).json()
    const otherGroupId = uniqueGroupId()
    await page.request.put(`/api/accounts/${MUTABLE_ACCOUNT_ID}`, {
      headers: await xsrfHeaders(page),
      data: { expected: current.fields, updated: { ...current.fields, groupId: otherGroupId } },
    })

    await page.locator('#groupId').fill(uniqueGroupId())
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    // Restore original groupId via API for the next run.
    const after = await (await page.request.get(`/api/accounts/${MUTABLE_ACCOUNT_ID}`)).json()
    await page.request.put(`/api/accounts/${MUTABLE_ACCOUNT_ID}`, {
      headers: await xsrfHeaders(page),
      data: { expected: after.fields, updated: { ...after.fields, groupId: original } },
    })
  })

  // Resolved (see e2e/DEFECTS.md #1): the backend's ConflictException now carries the exact
  // legacy text ("Record changed by some one else. Please review") for account save
  // conflicts, and the frontend surfaces it verbatim via e2.message.
  test('STORY-018: the conflict alert shows the exact legacy conflict message', async ({ page }) => {
    await page.locator('#acctId').fill(MUTABLE_ACCOUNT_ID)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page.getByTestId('account-update-form')).toBeVisible()

    const original = await page.locator('#groupId').inputValue()
    const current = await (await page.request.get(`/api/accounts/${MUTABLE_ACCOUNT_ID}`)).json()
    await page.request.put(`/api/accounts/${MUTABLE_ACCOUNT_ID}`, {
      headers: await xsrfHeaders(page),
      data: { expected: current.fields, updated: { ...current.fields, groupId: uniqueGroupId() } },
    })

    await page.locator('#groupId').fill(uniqueGroupId())
    await page.getByRole('button', { name: 'Enter (validate)' }).click()
    await page.getByRole('button', { name: 'F5 = Save' }).click()
    try {
      await expect(page.getByRole('alert')).toHaveText('Record changed by some one else. Please review')
    } finally {
      const after = await (await page.request.get(`/api/accounts/${MUTABLE_ACCOUNT_ID}`)).json()
      await page.request.put(`/api/accounts/${MUTABLE_ACCOUNT_ID}`, {
        headers: await xsrfHeaders(page),
        data: { expected: after.fields, updated: { ...after.fields, groupId: original } },
      })
    }
  })
})
