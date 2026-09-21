import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { AccountViewPage } from '../../pages/AccountViewPage'

const baseAccount = {
  acctId: 10,
  custId: 1,
  cardNum: '1111222233334444',
  fields: {
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
  },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountViewPage />
    </MemoryRouter>,
  )
}

describe('AccountViewPage (COACTVWC)', () => {
  it('renders the screen header, the account id field, and the Enter action on initial load', () => {
    renderPage()
    expect(screen.getByText('COACTVWC')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'View Account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument()
    expect(screen.queryByTestId('account-detail')).not.toBeInTheDocument()
  })

  it('blocks submit with the legacy message when Account ID is blank (VR-005/VR-006)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    // Note: exact source text has a double space after "must" (per validation-rules.md
    // VR-006); RTL's default text normalizer collapses whitespace, so we assert against
    // the raw DOM textContent to pin the exact legacy wording byte-for-byte.
    const error = await screen.findByText(/Account Filter must\s+be a non-zero 11 digit number/)
    expect(error.textContent).toBe('Account Filter must  be a non-zero 11 digit number')
  })

  it('blocks submit with the same message when Account ID is all zeros', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '0')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const error = await screen.findByText(/Account Filter must\s+be a non-zero 11 digit number/)
    expect(error.textContent).toBe('Account Filter must  be a non-zero 11 digit number')
  })

  it('renders every account field on a successful lookup', async () => {
    server.use(http.get('/api/accounts/:id', () => HttpResponse.json(baseAccount)))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    const detail = await screen.findByTestId('account-detail')
    expect(detail).toHaveTextContent('10')
    expect(detail).toHaveTextContent('1111222233334444')
    expect(detail).toHaveTextContent('JOHN Q PUBLIC')
    expect(detail).toHaveTextContent('42.5')
    expect(detail).toHaveTextContent('700')
  })

  it('shows the backend error message (e.g. not-found) instead of the detail grid', async () => {
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
    expect(screen.queryByTestId('account-detail')).not.toBeInTheDocument()
  })

  it('has a Back link to the main menu (screen-flow.md global back navigation)', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })
})
