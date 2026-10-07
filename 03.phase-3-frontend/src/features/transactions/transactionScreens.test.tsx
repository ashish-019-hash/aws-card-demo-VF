import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import { TransactionAddPage } from '../../pages/TransactionAddPage'
import { TransactionListPage } from '../../pages/TransactionListPage'
import { TransactionViewPage } from '../../pages/TransactionViewPage'
import { ApiError, api, type PageResponse, type TransactionDto } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    transactions: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number
    detail?: string
    constructor(message: string, status: number, detail?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.detail = detail
    }
  },
}))

// vitest globals are disabled, so testing-library cannot auto-register cleanup.
afterEach(cleanup)
afterEach(() => {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  vi.clearAllMocks()
})

const list = vi.mocked(api.transactions.list)
const get = vi.mocked(api.transactions.get)
const create = vi.mocked(api.transactions.create)

function transactionDto(idSuffix: string, overrides: Partial<TransactionDto> = {}): TransactionDto {
  return {
    id: idSuffix.padStart(16, '0'),
    transactionTypeCode: '01',
    transactionCategoryCode: 1,
    source: 'POS TERM',
    description: 'WHOLE FOODS MARKET #1042',
    amount: 86.42,
    merchantId: 411000101,
    merchantName: 'WHOLE FOODS MARKET #1042',
    merchantCity: 'AUSTIN',
    merchantZip: '78701',
    cardNumber: '4000123456789010',
    originationTimestamp: '2026-09-28 14:22:08',
    processingTimestamp: '2026-09-29 02:00:00',
    ...overrides,
  }
}

function pageOf(
  content: TransactionDto[],
  meta: Partial<PageResponse<TransactionDto>['page']> = {},
): PageResponse<TransactionDto> {
  return {
    content,
    page: { size: content.length, number: 0, totalElements: content.length, totalPages: 1, ...meta },
  }
}

/** The business screens require a signed-in regular user (type 'U'). */
function seedUserSession() {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'USER0001', userType: 'U' }))
}

function renderAt(path: string) {
  seedUserSession()
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/transactions" element={<TransactionListPage />} />
          <Route path="/transactions/view/:transactionId?" element={<TransactionViewPage />} />
          <Route path="/transactions/add" element={<TransactionAddPage />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('TransactionListPage', () => {
  it('loads the first page from the backend and renders it', async () => {
    list.mockResolvedValue(
      pageOf([transactionDto('101'), transactionDto('102', { description: 'SHELL OIL 57442', amount: -54.1 })], {
        size: 10,
        totalElements: 2,
        totalPages: 1,
      }),
    )
    const { container } = renderAt('/transactions')
    expect(screen.getByRole('heading', { name: 'Transaction List' })).toBeInTheDocument()
    expect(container.querySelector('[data-screen="COTRN00"]')).not.toBeNull()
    expect((await screen.findAllByText('0000000000000101')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('WHOLE FOODS MARKET #1042')).length).toBeGreaterThan(0)
    expect(list).toHaveBeenCalledWith(0, 10)
  })

  it('shows the top boundary message when Previous is pressed on page 1', async () => {
    list.mockResolvedValue(pageOf([transactionDto('101')], { size: 10 }))
    renderAt('/transactions')
    await screen.findAllByText('0000000000000101')
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('You are already at the top of the page.')).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('shows the backend error when the list cannot be read', async () => {
    list.mockRejectedValue(new ApiError('Unable to lookup transactions.', 500))
    renderAt('/transactions')
    expect(await screen.findByText('Unable to lookup transactions.')).toBeInTheDocument()
  })

  it('rejects a non-numeric filter with the legacy message (RULE-VAL-051)', async () => {
    list.mockResolvedValue(pageOf([transactionDto('101')], { size: 10 }))
    renderAt('/transactions')
    await screen.findAllByText('0000000000000101')
    await userEvent.type(screen.getByLabelText(/Start from transaction ID/), '12AB')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(await screen.findByText('Tran ID must be Numeric.')).toBeInTheDocument()
    // Only the initial page load hit the backend.
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('positions the list at the entered start transaction ID', async () => {
    list.mockResolvedValue(
      pageOf([transactionDto('101'), transactionDto('102'), transactionDto('103', { description: 'AMAZON MARKETPLACE' })]),
    )
    renderAt('/transactions')
    await screen.findAllByText('0000000000000101')
    await userEvent.type(screen.getByLabelText(/Start from transaction ID/), '102')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(await screen.findAllByText('0000000000000102')).not.toHaveLength(0)
    // The positioned fetch asks the backend for the bounded window from the top.
    expect(list).toHaveBeenLastCalledWith(0, 1000)
    expect(screen.queryByText('0000000000000101')).not.toBeInTheDocument()
  })
})

describe('TransactionViewPage', () => {
  it('renders the idle empty state when no transaction is selected', () => {
    const { container } = renderAt('/transactions/view')
    expect(screen.getByRole('heading', { name: 'Transaction View' })).toBeInTheDocument()
    expect(container.querySelector('[data-screen="COTRN01"]')).not.toBeNull()
    expect(screen.getByText('No transaction loaded')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it('shows the blank-ID message when looking up without an ID', async () => {
    renderAt('/transactions/view')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Tran ID can NOT be empty.')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it('loads the transaction detail for a URL-selected transaction', async () => {
    get.mockResolvedValue(transactionDto('104', { description: 'DELTA AIR LINES', merchantName: 'DELTA AIR LINES' }))
    renderAt('/transactions/view/0000000000000104')
    expect((await screen.findAllByText('DELTA AIR LINES')).length).toBeGreaterThan(0)
    expect(screen.getByText('Merchant ID')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('0000000000000104')
  })

  it('zero-pads a short entered ID and reports a backend 404 as not found', async () => {
    get.mockRejectedValue(new ApiError('Transaction not found', 404))
    renderAt('/transactions/view')
    await userEvent.type(screen.getByLabelText(/Transaction ID/), '999')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Transaction ID NOT found.')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('0000000000000999')
  })
})

/** Fills every COTRN02 field with values that pass the Step 4 rules. */
async function fillValidAddForm() {
  await userEvent.type(screen.getByLabelText(/Account number/), '10000000001')
  await userEvent.type(screen.getByLabelText(/Type code/), '01')
  await userEvent.type(screen.getByLabelText(/Category code/), '1')
  await userEvent.type(screen.getByLabelText(/Source/), 'POS TERM')
  await userEvent.type(screen.getByLabelText(/Amount/), '+00000086.42')
  await userEvent.type(screen.getByLabelText(/Description/), 'TEST PURCHASE')
  await userEvent.type(screen.getByLabelText(/Original date/), '2026-10-06')
  await userEvent.type(screen.getByLabelText(/Processing date/), '2026-10-07')
  await userEvent.type(screen.getByLabelText(/Merchant ID/), '411000101')
  await userEvent.type(screen.getByLabelText(/Merchant name/), 'TEST MERCHANT')
  await userEvent.type(screen.getByLabelText(/Merchant city/), 'AUSTIN')
  await userEvent.type(screen.getByLabelText(/Merchant ZIP/), '78701')
}

describe('TransactionAddPage', () => {
  it('creates the transaction with confirmation Y and shows the backend-assigned ID', async () => {
    // fetchLastTransaction probes the list for the last stored transaction.
    list.mockResolvedValue(pageOf([transactionDto('125')], { totalElements: 1, totalPages: 1 }))
    create.mockResolvedValue(transactionDto('126'))

    const { container } = renderAt('/transactions/add')
    expect(screen.getByRole('heading', { name: 'Transaction Add' })).toBeInTheDocument()
    expect(container.querySelector('[data-screen="COTRN02"]')).not.toBeNull()

    await fillValidAddForm()

    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))
    expect(await screen.findByText('Confirm to add this transaction.')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, add' }))
    expect(
      await screen.findByText('Transaction added successfully. Your Tran ID is 0000000000000126.'),
    ).toBeInTheDocument()

    expect(create).toHaveBeenCalledTimes(1)
    const request = create.mock.calls[0][0]
    expect(request).toMatchObject({
      id: '0000000000000126',
      accountId: 10000000001,
      transactionTypeCode: '01',
      transactionCategoryCode: 1,
      source: 'POS TERM',
      amount: '+00000086.42',
      description: 'TEST PURCHASE',
      merchantId: '411000101',
      merchantName: 'TEST MERCHANT',
      merchantCity: 'AUSTIN',
      merchantZip: '78701',
      originationTimestamp: '2026-10-06',
      processingTimestamp: '2026-10-07',
      confirmation: 'Y',
    })
    // A blank card number is omitted so the backend derives it from the account.
    expect(request).not.toHaveProperty('cardNumber')
  })

  it('keeps the form data and does not call the API when the confirmation is declined', async () => {
    renderAt('/transactions/add')
    await fillValidAddForm()
    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))
    expect(await screen.findByText('Confirm to add this transaction.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText('Confirm to add this transaction.')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('TEST MERCHANT')
    expect(create).not.toHaveBeenCalled()
  })

  it('shows the backend error and keeps the data when the create is rejected', async () => {
    list.mockResolvedValue(pageOf([transactionDto('125')], { totalElements: 1, totalPages: 1 }))
    create.mockRejectedValue(new ApiError('Tran ID already exist', 400))
    renderAt('/transactions/add')
    await fillValidAddForm()
    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, add' }))
    expect(await screen.findByText('Tran ID already exist')).toBeInTheDocument()
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('TEST MERCHANT')
  })

  it('blocks the review step with the legacy field messages (RULE-VAL-054/057)', async () => {
    renderAt('/transactions/add')
    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))
    // Cross-field key rule is reported on the account field.
    expect(await screen.findByText('Account or Card Number must be entered.')).toBeInTheDocument()
    expect(screen.getByText('Type CD can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('Amount can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('Merchant Zip can NOT be empty.')).toBeInTheDocument()
    // The ConfirmPanel is unreachable while the form is invalid.
    expect(screen.queryByText('Confirm to add this transaction.')).not.toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('enforces the strict amount, date and numeric edits (RULE-VAL-055/058/059/060/061)', async () => {
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '1000000000A')
    await userEvent.type(screen.getByLabelText(/Type code/), 'AB')
    await userEvent.type(screen.getByLabelText(/Category code/), '12A4')
    await userEvent.type(screen.getByLabelText(/Source/), 'POS TERM')
    await userEvent.type(screen.getByLabelText(/Amount/), '86.42')
    await userEvent.type(screen.getByLabelText(/Description/), 'TEST PURCHASE')
    await userEvent.type(screen.getByLabelText(/Original date/), '2026-02-30')
    await userEvent.type(screen.getByLabelText(/Processing date/), '2026-10-7')
    await userEvent.type(screen.getByLabelText(/Merchant ID/), '41100A101')
    await userEvent.type(screen.getByLabelText(/Merchant name/), 'TEST MERCHANT')
    await userEvent.type(screen.getByLabelText(/Merchant city/), 'AUSTIN')
    await userEvent.type(screen.getByLabelText(/Merchant ZIP/), '78701')
    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))

    expect(await screen.findByText('Account ID must be Numeric.')).toBeInTheDocument()
    expect(screen.getByText('Type CD must be Numeric.')).toBeInTheDocument()
    expect(screen.getByText('Category CD must be Numeric.')).toBeInTheDocument()
    expect(screen.getByText('Amount should be in format -99999999.99')).toBeInTheDocument()
    expect(screen.getByText('Orig Date - Not a valid date.')).toBeInTheDocument()
    expect(screen.getByText('Proc Date should be in format YYYY-MM-DD')).toBeInTheDocument()
    expect(screen.getByText('Merchant ID must be Numeric.')).toBeInTheDocument()
    expect(screen.queryByText('Confirm to add this transaction.')).not.toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('copies the last backend transaction into the form', async () => {
    list.mockResolvedValue(
      pageOf([transactionDto('125', { description: 'PANERA BREAD #4418', amount: 21.67, merchantId: 411000125 })], {
        totalElements: 1,
        totalPages: 1,
      }),
    )
    renderAt('/transactions/add')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByLabelText(/Description/)).toHaveValue('PANERA BREAD #4418')
    expect(screen.getByLabelText(/Card number/)).toHaveValue('4000123456789010')
    // Copy-last prefills the strict signed amount format (RULE-VAL-059).
    expect(screen.getByLabelText(/Amount/)).toHaveValue('+00000021.67')
    expect(screen.getByLabelText(/Merchant ID/)).toHaveValue('411000125')
    expect(screen.getByLabelText(/Original date/)).toHaveValue('2026-09-28')
    expect(list).toHaveBeenCalledWith(0, 1)
  })
})
