import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/server'
import { TransactionAddPage } from './TransactionAddPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionAddPage />
    </MemoryRouter>,
  )
}

async function fillMandatoryFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Account ID'), '10')
  await user.type(screen.getByLabelText('Type Code'), '01')
  await user.type(screen.getByLabelText('Category Code'), '01')
  await user.type(screen.getByLabelText('Source'), 'POS')
  await user.type(screen.getByLabelText('Description'), 'Coffee shop')
  await user.type(screen.getByLabelText('Amount'), '5.25')
  await user.type(screen.getByLabelText('Orig Date (YYYY-MM-DD)'), '2024-06-01')
  await user.type(screen.getByLabelText('Proc Date (YYYY-MM-DD)'), '2024-06-01')
  await user.type(screen.getByLabelText('Merchant ID'), '999')
  await user.type(screen.getByLabelText('Merchant Name'), 'Coffee Co')
  await user.type(screen.getByLabelText('Merchant City'), 'Anytown')
  await user.type(screen.getByLabelText('Merchant Zip'), '12345')
}

describe('TransactionAddPage confirm gate (VR-094)', () => {
  it('requires Confirm=Y before the transaction is actually submitted', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)

    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Confirm to add this transaction...')).toBeInTheDocument()
  })

  it('submits the transaction once Confirm=Y is supplied', async () => {
    server.use(
      http.post('/api/transactions', () =>
        HttpResponse.json({
          tranId: '0000000000000042',
          transaction: { tranId: '0000000000000042' },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await fillMandatoryFields(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByText('Transaction validated. Set Confirm to Y and press Enter to add.')

    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'Y')
    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))

    expect(await screen.findByText('Transaction added, ID 0000000000000042.')).toBeInTheDocument()
  })
})
