import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { BillPaymentPage } from '../../pages/BillPaymentPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <BillPaymentPage />
    </MemoryRouter>,
  )
}

describe('BillPaymentPage (COBIL00C) - additional coverage', () => {
  it('blocks lookup with "Acct ID can NOT be empty..." when blank (VR-095)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Acct ID can NOT be empty...')).toBeInTheDocument()
    expect(screen.queryByTestId('bill-pay-form')).not.toBeInTheDocument()
  })

  it('shows the backend error message and no balance/pay form when the lookup fails', async () => {
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
    expect(screen.queryByTestId('bill-pay-form')).not.toBeInTheDocument()
  })

  it('blocks pay with the invalid-value message for a non Y/N confirm (VR-096)', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'X')
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Invalid value. Valid values are (Y/N)...')).toBeInTheDocument()
  })

  it('clears the whole form (account id, balance, confirm) and shows no message when confirm is N (COBIL00C CLEAR-CURRENT-SCREEN)', async () => {
    let posted = false
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
      http.post('/api/bill-payments', () => {
        posted = true
        return HttpResponse.json({ paid: true, message: 'Payment successful.' })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'N')
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))
    expect(posted).toBe(false)
    expect(screen.queryByTestId('bill-pay-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bill-payment-balance')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toHaveValue('')
    expect(screen.queryByText('Confirm to make a bill payment...')).not.toBeInTheDocument()
  })

  it('shows the info message (no post) when confirm is blank', async () => {
    let posted = false
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
      http.post('/api/bill-payments', () => {
        posted = true
        return HttpResponse.json({ paid: true, message: 'Payment successful.' })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Confirm to make a bill payment...')).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('shows the backend error message when the payment post fails', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
      http.post('/api/bill-payments', () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'Account balance changed, please retry.' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'Y')
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Account balance changed, please retry.')).toBeInTheDocument()
  })

  it('maps a 400 field error onto the confirm field via ApiError.fieldErrors', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
      http.post('/api/bill-payments', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'confirm', message: 'Invalid value. Valid values are (Y/N)...' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'Y')
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Invalid value. Valid values are (Y/N)...')).toBeInTheDocument()
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it('clearing the account id after a lookup hides the balance/pay form again', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.clear(screen.getByLabelText('Account ID'))
    expect(screen.queryByTestId('bill-pay-form')).not.toBeInTheDocument()
  })

  it('F4 = Clear resets the whole screen (account id, balance, confirm) just like confirm=N (PF4)', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')
    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'Y')
    await user.click(screen.getByRole('button', { name: 'F4 = Clear' }))
    expect(screen.queryByTestId('bill-pay-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bill-payment-balance')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toHaveValue('')
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })
})
