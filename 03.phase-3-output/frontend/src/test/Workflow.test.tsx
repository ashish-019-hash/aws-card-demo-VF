import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import App from '../App'
import { UserFormPage } from '../pages/UserPages'
import { PaymentPage, ReportPage } from '../pages/PaymentReportPages'
import { TransactionAddPage } from '../pages/TransactionPages'
import { CardListPage } from '../pages/CardPages'
import { resetAuthentication, server, setAuthenticated } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetAuthentication()
  sessionStorage.clear()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

const signIn = async (role = 'USER') => {
  server.use(
    http.post('/api/session', () => {
      setAuthenticated()
      return HttpResponse.json({ userId: role === 'USER' ? 'USER0001' : 'ADMIN001', role, destination: '/api/menu' })
    }),
  )
  render(<App />)
  fireEvent.change(await screen.findByLabelText('User ID'), {
    target: { value: role === 'USER' ? 'USER0001' : 'ADMIN001' },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'USER123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByText('Workspace')
}

describe('authorization, confirmation, and list workflows', () => {
  it('does not render administration navigation to standard users', async () => {
    await signIn()
    expect(screen.queryByText('Users', { selector: 'a' })).not.toBeInTheDocument()
  })

  it('restores an authenticated session after reload and refreshes its CSRF token', async () => {
    setAuthenticated()
    sessionStorage.setItem(
      'carddemo.session',
      JSON.stringify({ userId: 'USER0001', role: 'USER', destination: '/api/menu' }),
    )
    server.use(
      http.get('/api/menu', () => HttpResponse.json({ menu: 'MAIN' })),
      http.get('/api/csrf', () => HttpResponse.json({ token: 'restored-token' })),
    )
    render(<App />)
    expect(await screen.findByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Signed in as')).toHaveTextContent('USER0001')
  })

  it('redirects a standard user away from an administrator route', async () => {
    setAuthenticated()
    sessionStorage.setItem(
      'carddemo.session',
      JSON.stringify({ userId: 'USER0001', role: 'USER', destination: '/api/menu' }),
    )
    server.use(http.get('/api/menu', () => HttpResponse.json({ menu: 'MAIN' })))
    window.history.pushState({}, '', '/users')
    render(<App />)
    expect(await screen.findByText('Workspace')).toBeInTheDocument()
    expect(screen.queryByText('Security users')).not.toBeInTheDocument()
  })

  it('requires a retrieved user before deletion and deletes without requiring a password', async () => {
    setAuthenticated()
    const deleted = vi.fn()
    server.use(
      http.get('/api/users/ADMIN001', () =>
        HttpResponse.json({ userId: 'ADMIN001', firstName: 'Admin', lastName: 'One', userType: 'A' }),
      ),
      http.delete('/api/users/ADMIN001', () => {
        deleted()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    render(
      <MemoryRouter>
        <UserFormPage mode="delete" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retrieve user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('User ID is required')
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'ADMIN001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retrieve user' }))
    await screen.findByDisplayValue('Admin')
    fireEvent.click(screen.getByRole('button', { name: 'Delete user' }))
    await waitFor(() => expect(deleted).toHaveBeenCalledOnce())
  })

  it('requires Y before submitting a payment', async () => {
    setAuthenticated()
    const paid = vi.fn()
    server.use(
      http.post('/api/accounts/1/payments', () => {
        paid()
        return HttpResponse.json({ status: 'PAID', paidAmount: 1, newBalance: 0, transaction: {} })
      }),
    )
    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit payment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter Y')
    expect(paid).not.toHaveBeenCalled()
  })

  it('requires Y confirmation before transaction entry and submits a practical signed amount', async () => {
    setAuthenticated()
    const added = vi.fn()
    server.use(
      http.post('/api/transactions', async ({ request }) => {
        added(await request.json())
        return HttpResponse.json({ status: 'ADDED', transaction: { transactionId: '1' } })
      }),
    )
    render(
      <MemoryRouter>
        <TransactionAddPage />
      </MemoryRouter>,
    )
    const fields: Record<string, string> = {
      'Account ID': '1',
      'Type code': '1',
      'Category code': '1',
      Source: 'WEB',
      Description: 'Coffee',
      Amount: '+12.50',
      'Origin date': '2024-01-01',
      'Processing date': '2024-01-02',
      'Merchant ID': '1',
      'Merchant name': 'Cafe',
      'Merchant city': 'Boston',
      'Merchant ZIP': '02108',
    }
    Object.entries(fields).forEach(([label, value]) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add confirmed transaction' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter Y')
    expect(added).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add confirmed transaction' }))
    await waitFor(() =>
      expect(added).toHaveBeenCalledWith(expect.objectContaining({ amount: '+12.50', confirmation: 'Y' })),
    )
  })

  it('requires Y confirmation before a report request and submits a custom period', async () => {
    setAuthenticated()
    const requested = vi.fn()
    server.use(
      http.post('/api/reports/requests', async ({ request }) => {
        requested(await request.json())
        return HttpResponse.json({
          requestId: 1,
          status: 'REQUESTED',
          type: 'CUSTOM',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          transactions: [],
        })
      }),
    )
    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'CUSTOM' } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2024-01-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter Y')
    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report request' }))
    await waitFor(() =>
      expect(requested).toHaveBeenCalledWith(expect.objectContaining({ type: 'CUSTOM', confirmation: 'Y' })),
    )
  })

  it('sends filters and uses pagination', async () => {
    const requested = vi.fn()
    server.use(
      http.get('/api/cards', ({ request }) => {
        requested(new URL(request.url).search)
        return HttpResponse.json({
          content: [
            {
              cardNumber: '1111111111111111',
              accountId: 1,
              embossedName: 'Ada Lovelace',
              activeStatus: 'Y',
              expirationDate: '2028-01-01',
            },
          ],
          totalPages: 2,
          totalElements: 2,
          number: 0,
          size: 10,
          first: true,
          last: false,
        })
      }),
    )
    render(
      <MemoryRouter>
        <CardListPage />
      </MemoryRouter>,
    )
    await screen.findByText('Ada Lovelace')
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(requested).toHaveBeenLastCalledWith(expect.stringContaining('accountId=1')))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(requested).toHaveBeenLastCalledWith(expect.stringContaining('page=1')))
  })
})
