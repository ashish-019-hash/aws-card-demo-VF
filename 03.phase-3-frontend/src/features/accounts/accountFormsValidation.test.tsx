import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AccountUpdateFormValues } from '../../validation/accountUpdate'
import { AccountSearchForm } from './AccountSearchForm'
import { AccountUpdateForm } from './AccountUpdateForm'

afterEach(cleanup)

/** Baseline that passes every account-update edit. */
const baseline: AccountUpdateFormValues = {
  activeStatus: 'Y',
  openDate: '2019-03-15',
  expirationDate: '2027-03-31',
  reissueDate: '2024-03-15',
  creditLimit: '7500.00',
  cashCreditLimit: '2500.00',
  currentBalance: '1284.50',
  currentCycleCredit: '450.00',
  currentCycleDebit: '-1734.50',
  groupId: 'A000000001',
  firstName: 'Sarah',
  middleName: 'J',
  lastName: 'Whitfield',
  ssn: '123456789',
  dateOfBirth: '1986-07-22',
  ficoCreditScore: '742',
  addressLine1: '1234 Maple Ave',
  addressLine2: 'Apt 4B',
  addressLine3: 'Austin',
  addressStateCode: 'TX',
  addressZip: '78701',
  addressCountryCode: 'USA',
  phoneNumber1: '5125550147',
  phoneNumber2: '',
  governmentIssuedId: 'TX-DL-48213977',
  eftAccountId: '1234567890',
  primaryCardholderIndicator: 'Y',
}

function renderUpdateForm() {
  const onValidated = vi.fn()
  render(
    <AccountUpdateForm
      accountId="00000000010"
      customerId="1"
      baseline={baseline}
      phase="editing"
      onValidated={onValidated}
      onSave={vi.fn()}
      onDiscard={vi.fn()}
      onEdited={vi.fn()}
    />,
  )
  return { onValidated }
}

/** Step 4 — field-level error wiring on the account forms. */
describe('AccountSearchForm validation (SCREEN-04/05 lookup)', () => {
  it('RULE-VAL-008 — blank account number shows the legacy prompt', async () => {
    const onSearch = vi.fn()
    render(<AccountSearchForm onSearch={onSearch} />)
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Account number not provided')).toBeInTheDocument()
    expect(screen.getByLabelText(/Account number/)).toHaveAttribute('aria-invalid', 'true')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('RULE-VAL-009 — a short account number shows the 11-digit edit message', async () => {
    const onSearch = vi.fn()
    render(<AccountSearchForm onSearch={onSearch} />)
    await userEvent.type(screen.getByLabelText(/Account number/), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(
      await screen.findByText('Account number must be a non-zero 11-digit number.'),
    ).toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })
})

describe('AccountUpdateForm validation (SCREEN-05 COACTUP)', () => {
  it('passes the fetched baseline through to onValidated', async () => {
    const { onValidated } = renderUpdateForm()
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(onValidated).toHaveBeenCalledWith(baseline, false)
  })

  it('RULE-VAL-029 — state/zip combo error lands on both fields (CA + 78701)', async () => {
    const { onValidated } = renderUpdateForm()
    const state = screen.getByLabelText(/State/)
    await userEvent.clear(state)
    await userEvent.type(state, 'CA')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(await screen.findAllByText('Invalid zip code for state')).toHaveLength(2)
    expect(screen.getByLabelText(/State/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/ZIP code/)).toHaveAttribute('aria-invalid', 'true')
    expect(onValidated).not.toHaveBeenCalled()
  })

  it('RULE-VAL-026 — unknown state code shows the lookup message', async () => {
    renderUpdateForm()
    const state = screen.getByLabelText(/State/)
    await userEvent.clear(state)
    await userEvent.type(state, 'ZZ')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(await screen.findByText('State: is not a valid state code')).toBeInTheDocument()
  })

  it('RULE-VAL-030 — invalid area code shows the NANP lookup message', async () => {
    const { onValidated } = renderUpdateForm()
    const phone = screen.getByLabelText(/Phone 1/)
    await userEvent.clear(phone)
    await userEvent.type(phone, '1235550147')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText('Phone Number 1: Not valid North America general purpose area code'),
    ).toBeInTheDocument()
    expect(onValidated).not.toHaveBeenCalled()
  })

  it('RULE-VAL-018 — invalid SSN area number shows the segment message', async () => {
    renderUpdateForm()
    const ssn = screen.getByLabelText(/SSN/)
    await userEvent.clear(ssn)
    await userEvent.type(ssn, '666121234')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText('SSN: First 3 chars: should not be 000, 666, or between 900 and 999'),
    ).toBeInTheDocument()
  })

  it('RULE-VAL-016 — a future date of birth is rejected', async () => {
    renderUpdateForm()
    const dob = screen.getByLabelText(/Date of birth/)
    await userEvent.clear(dob)
    await userEvent.type(dob, '2099-01-01')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(await screen.findByText('Date of Birth:cannot be in the future')).toBeInTheDocument()
  })

  it('RULE-VAL-017 — a malformed money value shows the legacy edit message', async () => {
    renderUpdateForm()
    const creditLimit = screen.getByLabelText(/Credit limit/)
    await userEvent.clear(creditLimit)
    await userEvent.type(creditLimit, '12.345')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(await screen.findByText('Credit Limit is not valid')).toBeInTheDocument()
  })
})
