import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../server'
import { TransactionViewPage } from '../../pages/TransactionViewPage'

const detail = {
  tranId: '100',
  cardNum: '1111222233334444',
  typeCd: '01',
  catCd: '001',
  source: 'POS',
  description: 'GROCERY STORE',
  amount: 42.5,
  origTs: '2024-01-01T10:00:00',
  procTs: '2024-01-02T10:00:00',
  merchantId: '999',
  merchantName: 'ACME',
  merchantCity: 'ANYTOWN',
  merchantZip: '12345',
}

function renderPage(initialEntries?: (string | { pathname: string; state?: unknown })[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries ?? ['/transactions/view']}>
      <TransactionViewPage />
    </MemoryRouter>,
  )
}

describe('TransactionViewPage (COTRN01C)', () => {
  it('renders the screen header and transaction-id field with no detail grid initially', () => {
    renderPage()
    expect(screen.getByText('COTRN01C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'View Transaction' })).toBeInTheDocument()
    expect(screen.getByLabelText('Transaction ID')).toBeInTheDocument()
    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument()
  })

  it('auto-looks-up the transaction when tranId is present in the URL search params', async () => {
    server.use(http.get('/api/transactions/:id', () => HttpResponse.json(detail)))
    renderPage(['/transactions/view?tranId=100'])
    const grid = await screen.findByTestId('transaction-detail')
    expect(grid).toHaveTextContent('GROCERY STORE')
    expect(grid).toHaveTextContent('ACME')
  })

  it('blocks submit with "Tran ID can NOT be empty..." when blank (VR-071)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Tran ID can NOT be empty...')).toBeInTheDocument()
    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument()
  })

  it('looks up manually and renders every field in the detail grid', async () => {
    server.use(http.get('/api/transactions/:id', () => HttpResponse.json(detail)))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Transaction ID'), '100')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const grid = await screen.findByTestId('transaction-detail')
    expect(grid).toHaveTextContent('1111222233334444')
    expect(grid).toHaveTextContent('999')
    expect(grid).toHaveTextContent('12345')
  })

  it('shows the backend not-found message instead of the detail grid', async () => {
    server.use(
      http.get('/api/transactions/:id', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Transaction NOT found...' }, { status: 404 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Transaction ID'), '999999')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Transaction NOT found...')).toBeInTheDocument()
    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument()
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })

  it('F3 = Exit/Back preserves the origin route passed via navigation state', () => {
    renderPage([{ pathname: '/transactions/view', state: { from: '/transactions' } }])
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/transactions')
  })

  it('F4 = Clear resets the transaction id field and hides the detail grid (PF4)', async () => {
    server.use(http.get('/api/transactions/:id', () => HttpResponse.json(detail)))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Transaction ID'), '100')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByTestId('transaction-detail')
    await user.click(screen.getByRole('button', { name: 'F4 = Clear' }))
    expect(screen.getByLabelText('Transaction ID')).toHaveValue('')
    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument()
  })

  it('F5 = Back to Transaction List navigates to /transactions (PF5)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/transactions/view']}>
        <Routes>
          <Route path="/transactions/view" element={<TransactionViewPage />} />
          <Route path="/transactions" element={<div>TRANSACTION LIST SCREEN</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'F5 = Back to Transaction List' }))
    expect(await screen.findByText('TRANSACTION LIST SCREEN')).toBeInTheDocument()
  })
})
