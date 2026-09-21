import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { AccountUpdatePage } from '../../pages/AccountUpdatePage'

const baseFields = {
  activeStatus: 'Y',
  creditLimit: 5000,
  cashCreditLimit: 1000,
  currBal: 42.5,
  currCycCredit: 10,
  currCycDebit: 5,
  openDate: '2020-01-01',
  expirationDate: '2030-01-01',
  reissueDate: '2020-01-01',
  creditLimitAsSet: null,
  groupId: 'GRP1',
  firstName: 'JOHN',
  middleName: 'Q',
  lastName: 'PUBLIC',
  addrLine1: '123 MAIN ST',
  addrLine2: 'APT 4',
  addrLine3: 'ANYTOWN',
  addrStateCd: 'CA',
  addrCountryCd: 'USA',
  addrZip: '12345',
  phoneNum1: '(123)456-7890',
  phoneNum2: '(123)456-7890',
  ssn: '123456789',
  govtIssuedId: 'ID123',
  dob: '1990-01-01',
  eftAccountId: '1234567890',
  priCardHolderInd: 'Y',
  ficoCreditScore: 700,
}

const baseAccount = { acctId: 10, custId: 1, cardNum: '1111222233334444', fields: baseFields }

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountUpdatePage />
    </MemoryRouter>,
  )
}

async function goToEdit(user: ReturnType<typeof userEvent.setup>) {
  server.use(http.get('/api/accounts/:id', () => HttpResponse.json(baseAccount)))
  renderPage()
  await user.type(screen.getByLabelText('Account ID'), '10')
  await user.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByTestId('account-update-form')
}

async function changeAndValidate(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (value) await user.type(input, value)
  await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
}

describe('AccountUpdatePage (COACTUPC)', () => {
  it('renders the search screen with the account-id field and Enter action initially', () => {
    renderPage()
    expect(screen.getByText('COACTUPC')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Update Account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toBeInTheDocument()
    expect(screen.queryByTestId('account-update-form')).not.toBeInTheDocument()
  })

  it('blocks search with "Account number not provided" when blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Account number not provided')).toBeInTheDocument()
  })

  it('blocks search with the non-zero-numeric message for a non-numeric account id', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(
      await screen.findByText('Account Number if supplied must be a 11 digit Non-Zero Number'),
    ).toBeInTheDocument()
  })

  it('shows the backend error message when the lookup fails', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Account ID NOT found...' }, { status: 404 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '99999999999')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Account ID NOT found...')).toBeInTheDocument()
    expect(screen.queryByTestId('account-update-form')).not.toBeInTheDocument()
  })

  it('looks up the account and pre-fills the edit form with the fetched values', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    expect(screen.getByLabelText('First Name')).toHaveValue('JOHN')
    expect(screen.getByLabelText('Last Name')).toHaveValue('PUBLIC')
    expect(screen.getByLabelText('FICO Score')).toHaveValue(700)
    expect(screen.getByLabelText('SSN')).toHaveValue('123456789')
  })

  it('shows "No change detected" when validated values equal the fetched snapshot', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('No change detected with respect to values fetched.')).toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it('validates a real change and proceeds to the confirm/save step', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'First Name', 'JANE')
    expect(await screen.findByText('Changes validated.Press F5 to save')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-actions')).toBeInTheDocument()
  })

  it('F5 = Save commits the change and shows the success message', async () => {
    server.use(
      http.put('/api/accounts/:id', () =>
        HttpResponse.json({
          changed: true,
          account: { ...baseAccount, fields: { ...baseFields, firstName: 'JANE' } },
        }),
      ),
    )
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'First Name', 'JANE')
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('Changes committed to database')).toBeInTheDocument()
  })

  it('F12 = Cancel from confirm reverts the field and returns to the edit step', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'First Name', 'JANE')
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F12 = Cancel' }))
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
    expect(screen.getByLabelText('First Name')).toHaveValue('JOHN')
  })

  it('save conflict (409) shows the backend message and refreshes the snapshot', async () => {
    let getCalls = 0
    server.use(
      http.get('/api/accounts/:id', () => {
        getCalls += 1
        return HttpResponse.json(baseAccount)
      }),
      http.put('/api/accounts/:id', () =>
        HttpResponse.json(
          { code: 'CONFLICT', message: 'DATA_CHANGED: The record has been updated by another user.' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByTestId('account-update-form')
    await changeAndValidate(user, 'First Name', 'JANE')
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))
    expect(
      await screen.findByText('DATA_CHANGED: The record has been updated by another user.'),
    ).toBeInTheDocument()
    expect(getCalls).toBe(2)
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it('save failure with a 400 validation error maps field errors from the backend', async () => {
    server.use(
      http.put('/api/accounts/:id', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'addrZip', message: 'Zip must be a 5 digit number.' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'First Name', 'JANE')
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('Zip must be a 5 digit number.')).toBeInTheDocument()
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it.each([
    ['Account Status (Y/N)', 'X', 'Account Status must be supplied.'],
    ['Credit Limit', 'abc', 'Credit Limit must be supplied.'],
    ['Zip', '123', 'Zip must be a 5 digit number.'],
    ['EFT Account ID', '123', 'EFT Account Id must be a 10 digit number.'],
    ['Primary Card Holder (Y/N)', 'X', 'Primary Card Holder must be supplied.'],
    ['State', 'ZZ', 'State: is not a valid state code'],
    ['City (Address Line 3)', '123', 'City must be supplied.'],
  ])('blocks validate with the exact legacy message for %s = "%s"', async (label, value, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, label, value)
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it.each([
    ['299', 'FICO Score: should be between 300 and 850'],
    ['851', 'FICO Score: should be between 300 and 850'],
  ])('blocks validate with a FICO score of %s (VR-040 boundary)', async (fico, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'FICO Score', fico)
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it.each(['300', '850'])('accepts the boundary FICO score of %s', async (fico) => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'FICO Score', fico)
    expect(await screen.findByText('Changes validated.Press F5 to save')).toBeInTheDocument()
  })

  it('blocks validate when Date of Birth is today (VR-035: must be strictly in the past)', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'Date of Birth (YYYY-MM-DD)', today)
    const error = await screen.findByText(/Date of Birth:cannot be in the future/)
    expect(error.textContent).toBe('Date of Birth:cannot be in the future ')
  })

  it('blocks validate with a calendar-invalid Open Date', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'Open Date (YYYY-MM-DD)', '2021-02-30')
    expect(await screen.findByText('Open Date validation error: not a valid date')).toBeInTheDocument()
  })

  it.each([
    ['000', 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999'],
    ['666', 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999'],
    ['950', 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999'],
  ])('blocks validate with an invalid SSN area code %s (VR-037)', async (area, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'SSN', `${area}456789`)
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('blocks validate with "SSN must be 9 digits." for a short SSN', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'SSN', '12345')
    expect(await screen.findByText('SSN must be 9 digits.')).toBeInTheDocument()
  })

  it.each([
    ['(00)456-7890', 'Phone Number 1: Area code must be A 3 digit number.'],
    ['(000)456-7890', 'Phone Number 1: Area code cannot be zero'],
    ['(123)000-7890', 'Phone Number 1: Prefix code cannot be zero'],
    ['(123)456-0000', 'Phone Number 1: Line number code cannot be zero'],
    ['123-456-7890', 'Phone Number 1: must be in format (NNN)NNN-NNNN.'],
  ])('blocks validate with an invalid Phone Number 1 = "%s"', async (phone, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    await changeAndValidate(user, 'Phone Number 1', phone)
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })
})
