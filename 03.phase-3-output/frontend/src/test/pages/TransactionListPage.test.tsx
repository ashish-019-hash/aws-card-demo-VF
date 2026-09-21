import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { TransactionListPage } from '../../pages/TransactionListPage'

const oneTxn = {
  items: [{ tranId: '100', origTs: '2024-01-01', description: 'GROCERY STORE', amount: 42.5 }],
  hasNext: false,
  hasPrevious: false,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionListPage />
    </MemoryRouter>,
  )
}

describe('TransactionListPage (COTRN00C)', () => {
  it('loads and renders the transaction list on initial mount', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json(oneTxn)))
    renderPage()
    const table = await screen.findByTestId('transaction-list')
    expect(within(table).getByText('GROCERY STORE')).toBeInTheDocument()
    expect(within(table).getByText('42.50')).toBeInTheDocument()
  })

  it('shows "No transactions found." for an empty list', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    renderPage()
    expect(await screen.findByText('No transactions found.')).toBeInTheDocument()
  })

  it('blocks the jump-to-id search with "Tran ID must be Numeric ..." for a non-numeric id (VR-070)', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No transactions found.')
    await user.type(screen.getByLabelText('Jump to Transaction ID'), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Tran ID must be Numeric ...')).toBeInTheDocument()
  })

  it('accepts a numeric jump-to-id and re-loads from that starting point', async () => {
    let lastUrl = ''
    server.use(
      http.get('/api/transactions', ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json(oneTxn)
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('GROCERY STORE')
    await user.type(screen.getByLabelText('Jump to Transaction ID'), '100')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText('GROCERY STORE')
    expect(lastUrl).toContain('startId=100')
  })

  it('paginates with F7/F8 and disables the buttons appropriately', async () => {
    const page0 = { items: [{ tranId: '1', origTs: '2024-01-01', description: 'A', amount: 1 }], hasNext: true, hasPrevious: false }
    const page1 = { items: [{ tranId: '2', origTs: '2024-01-02', description: 'B', amount: 2 }], hasNext: false, hasPrevious: true }
    let calls = 0
    server.use(
      http.get('/api/transactions', () => {
        calls += 1
        return HttpResponse.json(calls === 1 ? page0 : page1)
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('A')
    expect(screen.getByRole('button', { name: 'F7 = Prev Page' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'F8 = Next Page' }))
    expect(await screen.findByText('B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'F8 = Next Page' })).toBeDisabled()
  })

  it('renders an "S = View" link to the transaction detail route and a Back link to /menu', async () => {
    server.use(http.get('/api/transactions', () => HttpResponse.json(oneTxn)))
    renderPage()
    await screen.findByText('GROCERY STORE')
    expect(screen.getByRole('link', { name: 'S = View' })).toHaveAttribute('href', '/transactions/view?tranId=100')
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })

  it('shows the backend error message when the list request fails', async () => {
    server.use(
      http.get('/api/transactions', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Unable to load transactions right now.' }, { status: 500 }),
      ),
    )
    renderPage()
    expect(await screen.findByText('Unable to load transactions right now.')).toBeInTheDocument()
  })
})
