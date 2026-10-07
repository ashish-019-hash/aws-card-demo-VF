import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import { TransactionAddPage } from '../../pages/TransactionAddPage'
import { TransactionListPage } from '../../pages/TransactionListPage'
import { TransactionViewPage } from '../../pages/TransactionViewPage'
import { ApiError, api, type CreditCardDto, type PageResponse, type TransactionDto } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    transactions: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
    cards: {
      byAccount: vi.fn(),
      get: vi.fn(),
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
const cardsByAccount = vi.mocked(api.cards.byAccount)
const cardsGet = vi.mocked(api.cards.get)

/** Minimal card DTO for the copy-last cross-reference resolution. */
function cardDto(cardNumber: string, accountId: number): CreditCardDto {
  return {
    cardNumber,
    version: 1,
    accountId,
    cvvCode: 123,
    embossedName: 'JANE DOE',
    expirationDate: '2027-05-31',
    activeStatus: 'Y',
  }
}

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
    const stored = [transactionDto('101'), transactionDto('102'), transactionDto('103', { description: 'AMAZON MARKETPLACE' })]
    list.mockImplementation(async (page, size) =>
      pageOf(stored.slice(page * size, page * size + size), {
        number: page,
        size,
        totalElements: stored.length,
        totalPages: Math.max(1, Math.ceil(stored.length / size)),
      }),
    )
    renderAt('/transactions')
    await screen.findAllByText('0000000000000101')
    await userEvent.type(screen.getByLabelText(/Start from transaction ID/), '102')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(await screen.findAllByText('0000000000000102')).not.toHaveLength(0)
    expect(screen.getAllByText('0000000000000103').length).toBeGreaterThan(0)
    expect(screen.queryByText('0000000000000101')).not.toBeInTheDocument()
    // The positioned page is read with page-sized requests, not a fixed window.
    expect(list).toHaveBeenLastCalledWith(0, 10)
  })

  it('reports an honest next page when the positioned start is beyond the first thousand records', async () => {
    // 1,015 stored transactions: the old fixed 1,000-record window silently
    // claimed end-of-file for anything positioned past it.
    const total = 1015
    list.mockImplementation(async (page, size) => {
      const startIndex = page * size
      const content = Array.from(
        { length: Math.max(0, Math.min(size, total - startIndex)) },
        (_, offset) => transactionDto(String(startIndex + offset + 1)),
      )
      return pageOf(content, {
        number: page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size),
      })
    })
    renderAt('/transactions')
    await screen.findAllByText('0000000000000001')
    await userEvent.type(screen.getByLabelText(/Start from transaction ID/), '1001')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect((await screen.findAllByText('0000000000001001')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('0000000000001010').length).toBeGreaterThan(0)

    // Records 1011..1015 exist, so Next must page forward instead of
    // reporting the bottom of the list.
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect((await screen.findAllByText('0000000000001015')).length).toBeGreaterThan(0)
    expect(screen.queryByText('You are already at the bottom of the page.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('You are already at the bottom of the page.')).toBeInTheDocument()
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
    cardsByAccount.mockResolvedValue([cardDto('4000999988887777', 42)])
    renderAt('/transactions/add')
    // The entered target keys must survive the copy: legacy COTRN02C's
    // COPY-LAST-TRAN-DATA never touches the account or card fields.
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000042')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000999988887777')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByLabelText(/Description/)).toHaveValue('PANERA BREAD #4418')
    expect(screen.getByLabelText(/Account number/)).toHaveValue('00000000042')
    expect(screen.getByLabelText(/Card number/)).toHaveValue('4000999988887777')
    // Copy-last prefills the strict signed amount format (RULE-VAL-059).
    expect(screen.getByLabelText(/Amount/)).toHaveValue('+00000021.67')
    expect(screen.getByLabelText(/Merchant ID/)).toHaveValue('411000125')
    expect(screen.getByLabelText(/Original date/)).toHaveValue('2026-09-28')
    // The keys were resolved through the cross-reference before copying.
    expect(cardsByAccount).toHaveBeenCalledWith('00000000042')
    expect(list).toHaveBeenCalledWith(0, 1)
  })

  it('disables the form and writes the reviewed snapshot while confirming and saving', async () => {
    list.mockResolvedValue(pageOf([transactionDto('125')], { totalElements: 1, totalPages: 1 }))
    let resolveCreate: (dto: TransactionDto) => void = () => {}
    create.mockImplementation(
      () => new Promise<TransactionDto>((resolve) => (resolveCreate = resolve)),
    )

    renderAt('/transactions/add')
    await fillValidAddForm()
    await userEvent.click(screen.getByRole('button', { name: 'Review and add' }))
    expect(await screen.findByText('Confirm to add this transaction.')).toBeInTheDocument()

    // While the reviewed snapshot is pending, nothing on the form is editable.
    expect(screen.getByLabelText(/Merchant name/)).toBeDisabled()
    expect(screen.getByLabelText(/Account number/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear form' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy last transaction' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, add' }))
    // Still disabled while the save is in flight.
    expect(screen.getByLabelText(/Merchant name/)).toBeDisabled()

    resolveCreate(transactionDto('126'))
    expect(
      await screen.findByText('Transaction added successfully. Your Tran ID is 0000000000000126.'),
    ).toBeInTheDocument()
    // The record written is the reviewed snapshot.
    expect(create.mock.calls[0][0]).toMatchObject({ description: 'TEST PURCHASE', amount: '+00000086.42' })
    // The form is editable again after the save completes.
    expect(screen.getByLabelText(/Merchant name/)).not.toBeDisabled()
  })

  it('ignores a copy-last response that resolves after the form was cleared', async () => {
    cardsByAccount.mockResolvedValue([cardDto('4000999988887777', 42)])
    let resolveList: (page: PageResponse<TransactionDto>) => void = () => {}
    list.mockImplementation(
      () => new Promise<PageResponse<TransactionDto>>((resolve) => (resolveList = resolve)),
    )

    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000042')
    await userEvent.type(screen.getByLabelText(/Merchant name/), 'TYPED MERCHANT')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))
    // Clear supersedes the in-flight copy request.
    await userEvent.click(screen.getByRole('button', { name: 'Clear form' }))
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('')

    resolveList(pageOf([transactionDto('125', { merchantName: 'STALE MERCHANT' })], { totalElements: 1, totalPages: 1 }))
    // The stale copy must not repopulate the cleared form.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('')
    expect(screen.getByLabelText(/Description/)).toHaveValue('')
  })

  it('a copy response arriving after Review cannot change the reviewed values', async () => {
    cardsByAccount.mockResolvedValue([cardDto('4000123456789010', 10000000001)])
    create.mockResolvedValue(transactionDto('126'))
    // The copy's last-transaction fetch hangs; later fetches (the save path)
    // resolve normally.
    let resolveStaleCopy: (page: PageResponse<TransactionDto>) => void = () => {}
    let firstListCall = true
    list.mockImplementation(() => {
      if (firstListCall) {
        firstListCall = false
        return new Promise<PageResponse<TransactionDto>>((resolve) => (resolveStaleCopy = resolve))
      }
      return Promise.resolve(pageOf([transactionDto('125')], { totalElements: 1, totalPages: 1 }))
    })

    const { container } = renderAt('/transactions/add')
    await fillValidAddForm()
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    // While the copy is in flight the Review button is unavailable…
    expect(screen.getByRole('button', { name: 'Review and add' })).toBeDisabled()
    // …but an implicit (Enter-key) submission still reaches the form, and
    // entering review supersedes the copy.
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await screen.findByText('Confirm to add this transaction.')).toBeInTheDocument()

    // The stale copy resolves after review: nothing on screen may change.
    resolveStaleCopy(
      pageOf([transactionDto('125', { description: 'STALE COPY', merchantName: 'STALE MERCHANT' })], {
        totalElements: 1,
        totalPages: 1,
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByLabelText(/Description/)).toHaveValue('TEST PURCHASE')
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('TEST MERCHANT')
    expect(screen.getByText('Confirm to add this transaction.')).toBeInTheDocument()

    // Yes writes the reviewed snapshot, untouched by the stale copy.
    await userEvent.click(screen.getByRole('button', { name: 'Yes, add' }))
    expect(
      await screen.findByText('Transaction added successfully. Your Tran ID is 0000000000000126.'),
    ).toBeInTheDocument()
    expect(create.mock.calls[0][0]).toMatchObject({ description: 'TEST PURCHASE', merchantName: 'TEST MERCHANT' })
  })

  it('fills a blank card number from the account cross-reference, not from the copied transaction', async () => {
    // The last transaction on file is for a DIFFERENT card than the entered
    // account's card: the blank field must come from the xref, never the copy.
    list.mockResolvedValue(
      pageOf([transactionDto('125', { description: 'PANERA BREAD #4418', cardNumber: '4000123456789010' })], {
        totalElements: 1,
        totalPages: 1,
      }),
    )
    cardsByAccount.mockResolvedValue([cardDto('4000999988887777', 42)])
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000042')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByLabelText(/Description/)).toHaveValue('PANERA BREAD #4418')
    expect(screen.getByLabelText(/Account number/)).toHaveValue('00000000042')
    expect(screen.getByLabelText(/Card number/)).toHaveValue('4000999988887777')
  })

  it('fills a blank account from the card cross-reference when only the card is entered', async () => {
    list.mockResolvedValue(
      pageOf([transactionDto('125', { description: 'PANERA BREAD #4418' })], { totalElements: 1, totalPages: 1 }),
    )
    cardsGet.mockResolvedValue(cardDto('4000999988887777', 42))
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000999988887777')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByLabelText(/Description/)).toHaveValue('PANERA BREAD #4418')
    expect(cardsGet).toHaveBeenCalledWith('4000999988887777')
    expect(screen.getByLabelText(/Account number/)).toHaveValue('00000000042')
    expect(screen.getByLabelText(/Card number/)).toHaveValue('4000999988887777')
  })

  it('refuses to copy when no target key is entered (RULE-VAL-054)', async () => {
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Merchant name/), 'TYPED MERCHANT')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByText('Account or Card Number must be entered.')).toBeInTheDocument()
    // Nothing was fetched and nothing was copied.
    expect(list).not.toHaveBeenCalled()
    expect(cardsByAccount).not.toHaveBeenCalled()
    expect(cardsGet).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Merchant name/)).toHaveValue('TYPED MERCHANT')
    expect(screen.getByLabelText(/Description/)).toHaveValue('')
  })

  it('refuses to copy when a target key is malformed (RULE-VAL-055)', async () => {
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '1000000000A')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    // The message can appear both as the page message and as the field error.
    expect((await screen.findAllByText('Account ID must be Numeric.')).length).toBeGreaterThan(0)
    expect(list).not.toHaveBeenCalled()
    expect(cardsByAccount).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Description/)).toHaveValue('')
  })

  it('refuses to copy when the entered account does not exist', async () => {
    cardsByAccount.mockRejectedValue(new ApiError('Account not found', 404))
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000099')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByText('Account ID NOT found.')).toBeInTheDocument()
    expect(list).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Account number/)).toHaveValue('00000000099')
    expect(screen.getByLabelText(/Description/)).toHaveValue('')
  })

  it('uses the account cross-reference card when both entered keys disagree', async () => {
    cardsByAccount.mockResolvedValue([cardDto('4000999988887777', 42)])
    list.mockResolvedValue(
      pageOf([transactionDto('125', { description: 'ACCOUNT PRECEDENCE COPY' })], {
        totalElements: 1,
        totalPages: 1,
      }),
    )
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000042')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000123456789010')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByLabelText(/Description/)).toHaveValue('ACCOUNT PRECEDENCE COPY')
    expect(list).toHaveBeenCalled()
    expect(screen.getByLabelText(/Account number/)).toHaveValue('00000000042')
    expect(screen.getByLabelText(/Card number/)).toHaveValue('4000999988887777')
  })

  it('refuses to copy when the entered card does not exist', async () => {
    cardsGet.mockRejectedValue(new ApiError('Card not found', 404))
    renderAt('/transactions/add')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000123456789010')
    await userEvent.click(screen.getByRole('button', { name: 'Copy last transaction' }))

    expect(await screen.findByText('Card Number NOT found.')).toBeInTheDocument()
    expect(list).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Description/)).toHaveValue('')
  })
})
