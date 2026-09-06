import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AccountLookupPage, AccountUpdatePage } from '../pages/AccountPages'
import { CardDetailPage, CardListPage, CardLookupPage, CardUpdatePage } from '../pages/CardPages'
import { PaymentPage, ReportPage } from '../pages/PaymentReportPages'
import {
  TransactionAddPage,
  TransactionDetailPage,
  TransactionListPage,
  TransactionLookupPage,
} from '../pages/TransactionPages'
import { UserFormPage, UserListPage } from '../pages/UserPages'
import { DashboardPage } from '../pages/DashboardPage'
import { Layout } from '../components/Layout'
import { Pagination } from '../components/ui'
import { clearCsrfHeaderToken, setCsrfHeaderToken } from '../api/client'
import { resetAuthentication, server, setAuthenticated } from './server'

const account = {
  accountId: 1,
  version: 1,
  activeStatus: 'Y',
  currentBalance: 194.5,
  creditLimit: 1000,
  cashCreditLimit: 100,
  openDate: '2020-01-01',
  expirationDate: '2028-12-01',
  reissueDate: '2024-01-01',
  currentCycleCredit: 0,
  currentCycleDebit: 0,
  addressZip: '02108',
  accountGroupId: 'GROUP1',
  cards: [
    {
      cardNumber: '1111111111111111',
      accountId: 1,
      embossedName: 'Ada Lovelace',
      activeStatus: 'Y',
      expirationDate: '2028-01-01',
    },
  ],
  customer: {
    customerId: 1,
    version: 1,
    firstName: 'Ada',
    middleName: '',
    lastName: 'Lovelace',
    addressLine1: '1 Main St',
    addressLine2: '',
    city: 'Boston',
    addressStateCode: 'MA',
    addressCountryCode: 'USA',
    addressZip: '02108',
    primaryPhoneNumber: '(617)555-0100',
    secondaryPhoneNumber: '',
    ssn: '111223333',
    governmentIssuedId: '',
    dateOfBirth: '1980-01-01',
    eftAccountId: '123',
    primaryCardHolderIndicator: 'Y',
    ficoCreditScore: 750,
  },
}

const transaction = {
  transactionId: '42',
  cardNumber: '1111111111111111',
  transactionTypeCode: '01',
  transactionCategoryCode: 12,
  source: 'WEB',
  description: 'Coffee',
  amount: -12.5,
  merchantId: 7,
  merchantName: 'Cafe',
  merchantCity: 'Boston',
  merchantZip: '02108',
  originalTimestamp: '2024-01-01',
  processingTimestamp: '2024-01-02',
}

const page = <T,>(content: T[]) => ({
  content,
  totalPages: 1,
  totalElements: content.length,
  number: 0,
  size: 10,
  first: true,
  last: true,
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  setAuthenticated()
  setCsrfHeaderToken('test')
})
afterEach(() => {
  server.resetHandlers()
  resetAuthentication()
  clearCsrfHeaderToken()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

describe('account and card screens', () => {
  it('renders an accessible account lookup, rejects invalid IDs, and renders the linked entity details', async () => {
    server.use(http.get('/api/accounts/:id', () => HttpResponse.json(account)))
    render(
      <MemoryRouter>
        <AccountLookupPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Account lookup' })).toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toHaveAttribute('inputmode', 'numeric')
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('non-zero numeric account ID')

    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(await screen.findByRole('heading', { name: 'Account 1' })).toBeInTheDocument()
    expect(screen.getByText('$194.50')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1111111111111111' })).toHaveAttribute('href', '/cards/1111111111111111')
  })

  it('surfaces account lookup API errors without retaining unrelated details', async () => {
    server.use(
      http.get('/api/accounts/:id', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Account not found.' }, { status: 404 }),
      ),
    )
    render(
      <MemoryRouter>
        <AccountLookupPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('NOT_FOUND: Account not found.')
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('validates account-maintenance fields before save and blocks invalid input at the API boundary', async () => {
    const saved = vi.fn()
    server.use(
      http.get('/api/accounts/:id', () => HttpResponse.json(account)),
      http.put('/api/accounts/:id', () => {
        saved()
        return HttpResponse.json({ changed: true })
      }),
    )
    render(
      <MemoryRouter initialEntries={['/accounts/update?id=1']}>
        <AccountUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada')

    fireEvent.change(screen.getByLabelText('Fico Credit Score'), { target: { value: '299' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('FICO score must be from 300 to 850.')
    expect(saved).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Fico Credit Score'), { target: { value: '750' } })
    fireEvent.change(screen.getByLabelText('Current Balance'), { target: { value: '100.999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Monetary fields must be signed numbers')
    expect(saved).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Current Balance'), { target: { value: '100.00' } })
    fireEvent.change(screen.getByLabelText('Date Of Birth'), { target: { value: '2099-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('date of birth must be in the past')
    expect(saved).not.toHaveBeenCalled()
  })

  it('filters cards, renders empty results, and keeps invalid filters client-side', async () => {
    const requested = vi.fn()
    server.use(
      http.get('/api/cards', ({ request }) => {
        requested(new URL(request.url).search)
        return HttpResponse.json(page([]))
      }),
    )
    render(
      <MemoryRouter>
        <CardListPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('No cards match the supplied filters.')).toBeInTheDocument()
    const initialRequests = requested.mock.calls.length
    fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('card numbers must contain 16 digits')
    expect(requested).toHaveBeenCalledTimes(initialRequests)
  })

  it('navigates from a valid card lookup and rejects non-16-digit input', () => {
    render(
      <MemoryRouter initialEntries={['/cards/detail']}>
        <Routes>
          <Route path="/cards/detail" element={<CardLookupPage />} />
          <Route path="/cards/:cardNumber" element={<p>Card destination</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Find card' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a 16-digit card number.')
    fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '1111111111111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find card' }))
    expect(screen.getByText('Card destination')).toBeInTheDocument()
  })

  it('renders card details and exposes its semantic back and maintenance links', async () => {
    server.use(
      http.get('/api/cards/:cardNumber', () => HttpResponse.json({ ...account.cards[0], cvvCode: 123, version: 1 })),
    )
    render(
      <MemoryRouter initialEntries={['/cards/1111111111111111']}>
        <Routes>
          <Route path="/cards/:cardNumber" element={<CardDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cards/ })).toHaveAttribute('href', '/cards')
    expect(screen.getByRole('link', { name: 'Maintain this card' })).toHaveAttribute(
      'href',
      '/cards/update?card=1111111111111111',
    )
  })

  it('rejects malformed card updates before writing and renders the API failure', async () => {
    const updated = vi.fn()
    server.use(
      http.get('/api/cards/:cardNumber', () => HttpResponse.json({ ...account.cards[0], cvvCode: 123, version: 1 })),
      http.put('/api/cards/:cardNumber', () => {
        updated()
        return HttpResponse.json({ code: 'WRITE_FAILED', message: 'Card save failed.' }, { status: 500 })
      }),
    )
    render(
      <MemoryRouter initialEntries={['/cards/update?card=1111111111111111']}>
        <CardUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada Lovelace')
    fireEvent.change(screen.getByLabelText('Active status (Y/N)'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('alphabetic cardholder name')
    expect(updated).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Active status (Y/N)'), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('WRITE_FAILED: Card save failed.'))
    expect(updated).toHaveBeenCalledOnce()
  })
})

describe('transaction screens', () => {
  it('validates a numeric transaction-list filter and renders an empty list without an API call', async () => {
    const requested = vi.fn()
    server.use(
      http.get('/api/transactions', () => {
        requested()
        return HttpResponse.json(page([]))
      }),
    )
    render(
      <MemoryRouter>
        <TransactionListPage />
      </MemoryRouter>,
    )
    await screen.findByText('No transactions found.')
    const initialRequests = requested.mock.calls.length
    fireEvent.change(screen.getByLabelText('Starting transaction ID'), { target: { value: 'bad-id' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Transaction ID must be numeric.')
    expect(requested).toHaveBeenCalledTimes(initialRequests)
  })

  it('renders every transaction detail field and handles not-found failures', async () => {
    server.use(http.get('/api/transactions/:id', () => HttpResponse.json(transaction)))
    const { unmount } = render(
      <MemoryRouter initialEntries={['/transactions/42']}>
        <Routes>
          <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: '42' })).toBeInTheDocument()
    expect(screen.getByText('01 / 12')).toBeInTheDocument()
    expect(screen.getByText('-$12.50')).toBeInTheDocument()
    expect(screen.getByText('Cafe')).toBeInTheDocument()
    unmount()

    server.use(
      http.get('/api/transactions/:id', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Transaction not found.' }, { status: 404 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/transactions/404']}>
        <Routes>
          <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('NOT_FOUND: Transaction not found.')
  })

  it('validates transaction-add amount and confirmation, blocks invalid requests, and surfaces an API error', async () => {
    const added = vi.fn()
    const validFields: Record<string, string> = {
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
      'Confirm (Y)': 'Y',
    }
    server.use(
      http.post('/api/transactions', () => {
        added()
        return HttpResponse.json(
          { code: 'DUPLICATE_TRANSACTION', message: 'Transaction already exists.' },
          { status: 409 },
        )
      }),
    )
    render(
      <MemoryRouter>
        <TransactionAddPage />
      </MemoryRouter>,
    )

    for (const [label, value] of Object.entries({ ...validFields, Amount: '12.50' })) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Add confirmed transaction' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('amount must use a sign')
    expect(added).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '+12.50' } })
    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add confirmed transaction' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter Y to confirm the transaction.')
    expect(added).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add confirmed transaction' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('DUPLICATE_TRANSACTION: Transaction already exists.'),
    )
    expect(added).toHaveBeenCalledOnce()
  })

  it('blocks a blank direct lookup and routes a supplied transaction identifier', () => {
    render(
      <MemoryRouter initialEntries={['/transactions/detail']}>
        <Routes>
          <Route path="/transactions/detail" element={<TransactionLookupPage />} />
          <Route path="/transactions/:transactionId" element={<p>Transaction destination</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Find transaction' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Transaction ID can NOT be empty.')
    fireEvent.change(screen.getByLabelText('Transaction ID'), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find transaction' }))
    expect(screen.getByText('Transaction destination')).toBeInTheDocument()
  })
})

describe('payment, reporting, and security-user screens', () => {
  it('normalizes lowercase payment confirmation and renders a successful payment result', async () => {
    const received = vi.fn()
    server.use(
      http.post('/api/accounts/:id/payments', async ({ request }) => {
        received(await request.json())
        return HttpResponse.json({ status: 'PAID', paidAmount: 194.5, newBalance: 0, transaction })
      }),
    )
    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: 'y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit payment' }))
    await waitFor(() => expect(received).toHaveBeenCalledWith({ confirmation: 'Y' }))
    expect(await screen.findByRole('status')).toHaveTextContent('PAID: $194.50 paid. New balance: $0.00.')
  })

  it('validates custom report calendar dates and renders an empty submitted report', async () => {
    const requested = vi.fn()
    server.use(
      http.post('/api/reports/requests', async ({ request }) => {
        requested(await request.json())
        return HttpResponse.json({
          requestId: 5,
          status: 'SUBMITTED',
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
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-02-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2024-01-31' } })
    fireEvent.change(screen.getByLabelText('Confirm (Y)'), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('valid start and end dates in chronological order')
    expect(requested).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report request' }))
    await waitFor(() =>
      expect(requested).toHaveBeenCalledWith(expect.objectContaining({ type: 'CUSTOM', confirmation: 'Y' })),
    )
    expect(await screen.findByText('No transactions are included in this period.')).toBeInTheDocument()
  })

  it('filters users in uppercase, displays actions, and preserves a user after list API failure', async () => {
    const requests: string[] = []
    server.use(
      http.get('/api/users', ({ request }) => {
        requests.push(new URL(request.url).search)
        return HttpResponse.json(page([{ userId: 'ADMIN001', firstName: 'Admin', lastName: 'One', userType: 'A' }]))
      }),
    )
    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('ADMIN001')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('User ID starts with'), { target: { value: 'ad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(requests.at(-1)).toContain('startsWith=AD'))
    expect(screen.getByRole('link', { name: 'Update' })).toHaveAttribute('href', '/users/update?id=ADMIN001')
    expect(screen.getByRole('link', { name: 'Delete' })).toHaveAttribute('href', '/users/delete?id=ADMIN001')
  })

  it('validates all required new-user fields, reports duplicates, and clears a successful add form', async () => {
    server.use(
      http.post('/api/users', () =>
        HttpResponse.json({ code: 'DUPLICATE', message: 'User already exists.' }, { status: 409 }),
      ),
    )
    render(
      <MemoryRouter>
        <UserFormPage mode="add" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('user type are required')
    for (const [label, value] of Object.entries({
      'User ID': 'new0001',
      'First name': 'New',
      'Last name': 'User',
      Password: 'PASS123',
      'User type': 'u',
    })) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('DUPLICATE: User already exists.'))

    server.use(http.post('/api/users', () => HttpResponse.json({ userId: 'NEW0001' }, { status: 201 })))
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByRole('status')).toHaveTextContent('User NEW0001 was created.')
    expect(screen.getByLabelText('User ID')).toHaveValue('')
  })
})

describe('shared UI, layout, and role-focused navigation', () => {
  it('renders accessible pagination controls and disables the first-page Previous action', () => {
    const change = vi.fn()
    render(<Pagination page={{ number: 0, totalPages: 2, first: true, last: false }} onChange={change} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(change).toHaveBeenCalledOnce()
    expect(change).toHaveBeenCalledWith(1)
  })

  it('renders only role-appropriate dashboard tasks and layout navigation with a skip link', () => {
    const { rerender } = render(
      <MemoryRouter>
        <DashboardPage session={{ userId: 'USER0001', role: 'USER', destination: '/api/menu' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Make a bill payment/ })).toHaveAttribute('href', '/payments')
    expect(screen.queryByRole('link', { name: /Add a user/ })).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <Layout
          session={{ userId: 'ADMIN001', role: 'ADMINISTRATOR', destination: '/api/admin/menu' }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users')
    expect(screen.queryByRole('link', { name: 'Bill payment' })).not.toBeInTheDocument()
  })
})
