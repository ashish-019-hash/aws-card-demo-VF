import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { TransactionAddPage } from '../../pages/TransactionAddPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionAddPage />
    </MemoryRouter>,
  )
}

async function fillMandatoryFields(user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    accountId: '10',
    typeCd: '01',
    catCd: '01',
    source: 'POS',
    description: 'Coffee shop',
    amount: '5.25',
    origDate: '2024-06-01',
    procDate: '2024-06-01',
    merchantId: '999',
    merchantName: 'Coffee Co',
    merchantCity: 'Anytown',
    merchantZip: '12345',
    ...overrides,
  }
  const labels: Record<string, string> = {
    accountId: 'Account ID',
    typeCd: 'Type Code',
    catCd: 'Category Code',
    source: 'Source',
    description: 'Description',
    amount: 'Amount',
    origDate: 'Orig Date (YYYY-MM-DD)',
    procDate: 'Proc Date (YYYY-MM-DD)',
    merchantId: 'Merchant ID',
    merchantName: 'Merchant Name',
    merchantCity: 'Merchant City',
    merchantZip: 'Merchant Zip',
  }
  for (const [key, label] of Object.entries(labels)) {
    const value = values[key]
    if (value) await user.type(screen.getByLabelText(label), value)
  }
}

describe('TransactionAddPage (COTRN02C) - additional coverage', () => {
  it('renders the screen header and the add-form with the validate action initially', () => {
    renderPage()
    expect(screen.getByText('COTRN02C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Transaction' })).toBeInTheDocument()
    expect(screen.getByTestId('transaction-add-form')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
  })

  it('blocks validate with "Account or Card Number must be entered..." when both are blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { accountId: '' })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Account or Card Number must be entered...')).toBeInTheDocument()
  })

  it('blocks validate with "Account ID must be Numeric..." for a non-numeric account id', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { accountId: 'ABC' })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Account ID must be Numeric...')).toBeInTheDocument()
  })

  it.each([
    ['typeCd', 'Type Code', '', 'Type CD can NOT be empty...'],
    ['typeCd', 'Type Code', 'AB', 'Type CD must be Numeric...'],
    ['catCd', 'Category Code', '', 'Category CD can NOT be empty...'],
    ['catCd', 'Category Code', 'AB', 'Category CD must be Numeric...'],
    ['source', 'Source', '', 'Source can NOT be empty...'],
    ['description', 'Description', '', 'Description can NOT be empty...'],
    ['merchantId', 'Merchant ID', '', 'Merchant ID can NOT be empty...'],
    ['merchantId', 'Merchant ID', 'AB', 'Merchant ID must be Numeric...'],
    ['merchantName', 'Merchant Name', '', 'Merchant Name can NOT be empty...'],
    ['merchantCity', 'Merchant City', '', 'Merchant City can NOT be empty...'],
    ['merchantZip', 'Merchant Zip', '', 'Merchant Zip can NOT be empty...'],
  ])('shows the exact legacy message for %s="%s"', async (field, _label, value, expected) => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { [field]: value } as Record<string, string>)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it.each([
    ['abc', 'Amount should be in format -99999999.99'],
    ['1.234', 'Amount should be in format -99999999.99'],
    ['123456789', 'Amount should be in format -99999999.99'],
  ])('blocks validate with amount="%s" (amount format regex)', async (amount, expected) => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { amount })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it.each(['-99999999.99', '0', '99999999.99'])('accepts the boundary amount="%s"', async (amount) => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { amount })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(
      await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.'),
    ).toBeInTheDocument()
  })

  it('blocks validate with an invalid orig-date and the exact legacy messages', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { origDate: '2024/06/01' })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Orig Date should be in format YYYY-MM-DD')).toBeInTheDocument()
  })

  it('blocks validate with a calendar-invalid proc-date', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user, { procDate: '2024-02-30' })
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Proc Date - Not a valid date...')).toBeInTheDocument()
  })

  it('blocks confirm with the invalid-value message for a non Y/N confirm', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'X')
    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Invalid value. Valid values are (Y/N)...')).toBeInTheDocument()
  })

  it('shows an info message (no submit) when confirm is N', async () => {
    let submitted = false
    server.use(
      http.post('/api/transactions', () => {
        submitted = true
        return HttpResponse.json({ tranId: '1' })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'N')
    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Confirm to add this transaction...')).toBeInTheDocument()
    expect(submitted).toBe(false)
  })

  it('F5 = Copy Last Transaction blocks with an error message when Card Number is blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'F5 = Copy Last Transaction' }))
    expect(
      await screen.findByText('Card Number must be supplied to copy the last transaction...'),
    ).toBeInTheDocument()
  })

  it('F5 = Copy Last Transaction populates the form from the last-transaction endpoint', async () => {
    server.use(
      http.get('/api/transactions/last', () =>
        HttpResponse.json({
          tranId: '1',
          cardNum: '1111222233334444',
          typeCd: '02',
          catCd: 5,
          source: 'ONLINE',
          description: 'STREAMING SVC',
          amount: 9.99,
          origTs: '2024-05-01',
          procTs: '2024-05-01',
          merchantId: 321,
          merchantName: 'STREAM CO',
          merchantCity: 'WEBTOWN',
          merchantZip: '54321',
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), '1111222233334444')
    await user.click(screen.getByRole('button', { name: 'F5 = Copy Last Transaction' }))
    expect(await screen.findByText('Last transaction details copied.')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toHaveValue('STREAMING SVC')
    expect(screen.getByLabelText('Merchant Name')).toHaveValue('STREAM CO')
    expect(screen.getByLabelText('Amount')).toHaveValue('9.99')
  })

  it('F5 = Copy Last Transaction truncates full timestamps to YYYY-MM-DD and formats amount to 2 decimals', async () => {
    server.use(
      http.get('/api/transactions/last', () =>
        HttpResponse.json({
          tranId: '1',
          cardNum: '1111222233334444',
          typeCd: '02',
          catCd: 5,
          source: 'ONLINE',
          description: 'STREAMING SVC',
          amount: 10,
          origTs: '2024-05-01 10:15:30.000000',
          procTs: '2024-05-02 11:00:00.000000',
          merchantId: 321,
          merchantName: 'STREAM CO',
          merchantCity: 'WEBTOWN',
          merchantZip: '54321',
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), '1111222233334444')
    await user.click(screen.getByRole('button', { name: 'F5 = Copy Last Transaction' }))
    expect(await screen.findByText('Last transaction details copied.')).toBeInTheDocument()
    expect(screen.getByLabelText('Orig Date (YYYY-MM-DD)')).toHaveValue('2024-05-01')
    expect(screen.getByLabelText('Proc Date (YYYY-MM-DD)')).toHaveValue('2024-05-02')
    expect(screen.getByLabelText('Amount')).toHaveValue('10.00')
  })

  it('F5 = Copy Last Transaction shows the generic error message on API failure', async () => {
    server.use(http.get('/api/transactions/last', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), '1111222233334444')
    await user.click(screen.getByRole('button', { name: 'F5 = Copy Last Transaction' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('shows backend 400 field errors mapped onto the form when the submit fails', async () => {
    server.use(
      http.post('/api/transactions', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'merchantId', message: 'Merchant ID must be Numeric...' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'Y')
    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it('F4 = Clear resets every field, the validated state, and any message (PF4)', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')
    await user.click(screen.getByRole('button', { name: 'F4 = Clear' }))
    expect(screen.getByLabelText('Account ID')).toHaveValue('')
    expect(screen.getByLabelText('Description')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
    expect(screen.queryByText('Transaction validated. Set Confirm to Y and press Enter to add.')).not.toBeInTheDocument()
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })
})
