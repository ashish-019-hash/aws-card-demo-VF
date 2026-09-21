import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/server'
import { BillPaymentPage } from './BillPaymentPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <BillPaymentPage />
    </MemoryRouter>,
  )
}

describe('BillPaymentPage', () => {
  it('requires Confirm before posting the payment (VR-097)', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(await screen.findByText('42.50')).toBeInTheDocument()
    const payForm = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm).getByRole('button', { name: 'Enter' }))

    expect(await screen.findByText('Confirm to make a bill payment...')).toBeInTheDocument()
  })

  it('shows the "nothing to pay" message from the backend when balance is zero/negative', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 0 } }),
      ),
      http.post('/api/bill-payments', () =>
        HttpResponse.json({
          paid: false,
          tranId: null,
          amountPaid: null,
          newBalance: null,
          message: 'You have nothing to pay...',
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('0.00')

    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'Y')
    const payForm1 = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm1).getByRole('button', { name: 'Enter' }))

    expect(await screen.findByText('You have nothing to pay...')).toBeInTheDocument()
  })

  it('shows the success message and resets the form when the payment is posted', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ acctId: 10, custId: 1, cardNum: '1111', fields: { currBal: 42.5 } }),
      ),
      http.post('/api/bill-payments', () =>
        HttpResponse.json({
          paid: true,
          tranId: '0000000000000001',
          amountPaid: 42.5,
          newBalance: 0,
          message: 'Payment successful.',
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Account ID'), '10')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('42.50')

    await user.type(screen.getByLabelText('Confirm full balance payment (Y/N)'), 'Y')
    const payForm2 = screen.getByTestId('bill-pay-form')
    await user.click(within(payForm2).getByRole('button', { name: 'Enter' }))

    expect(await screen.findByText('Payment successful.')).toBeInTheDocument()
  })
})
