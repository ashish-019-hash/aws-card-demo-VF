import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import { BillPaymentPage } from '../../pages/BillPaymentPage'
import { ApiError, api, type AccountDto } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    accounts: { get: vi.fn() },
    billing: { pay: vi.fn() },
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

const getAccount = vi.mocked(api.accounts.get)
const pay = vi.mocked(api.billing.pay)

function accountDto(overrides: Partial<AccountDto> = {}): AccountDto {
  return {
    id: 10000000001,
    version: 0,
    activeStatus: 'Y',
    currentBalance: 1284.5,
    creditLimit: 5000,
    cashCreditLimit: 1000,
    openDate: '2020-01-01',
    expirationDate: '2028-01-01',
    reissueDate: '2024-01-01',
    currentCycleCredit: 0,
    currentCycleDebit: 0,
    addressZip: '78701',
    groupId: 'DEFAULT',
    ...overrides,
  }
}

/** The business screens require a signed-in regular user (type 'U'). */
function seedUserSession() {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'USER0001', userType: 'U' }))
}

function renderPage() {
  seedUserSession()
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/bill-payment']}>
        <BillPaymentPage />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('BillPaymentPage', () => {
  it('renders the heading with the legacy screen code', () => {
    const { container } = renderPage()
    expect(screen.getByRole('heading', { name: 'Bill Payment' })).toBeInTheDocument()
    expect(container.querySelector('[data-screen="COBIL00"]')).not.toBeNull()
  })

  it('shows the blank-ID message when looking up without an account ID', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Look up balance' }))
    expect(await screen.findByText('Acct ID can NOT be empty.')).toBeInTheDocument()
    expect(getAccount).not.toHaveBeenCalled()
  })

  it('pays the full balance after confirmation using the backend response', async () => {
    getAccount.mockResolvedValue(accountDto())
    pay.mockResolvedValue({
      accountId: 10000000001,
      cardNumber: '4000123456789010',
      transactionId: '0000000000000126',
      amount: 1284.5,
      resultingBalance: 0,
    })
    renderPage()
    await userEvent.type(screen.getByLabelText(/Account ID/), '10000000001')
    await userEvent.click(screen.getByRole('button', { name: 'Look up balance' }))
    expect(await screen.findByText('Confirm to make a bill payment.')).toBeInTheDocument()
    expect(getAccount).toHaveBeenCalledWith('10000000001')
    expect(screen.getByText('$1,284.50')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, pay full balance' }))
    expect(await screen.findByText('Payment successful. Your Transaction ID is 0000000000000126.')).toBeInTheDocument()
    expect(pay).toHaveBeenCalledWith('10000000001', 'Y')
    expect(screen.getByText('BILL PAYMENT - ONLINE')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('warns when there is nothing to pay', async () => {
    getAccount.mockResolvedValue(accountDto({ currentBalance: 0 }))
    renderPage()
    await userEvent.type(screen.getByLabelText(/Account ID/), '10000000002')
    await userEvent.click(screen.getByRole('button', { name: 'Look up balance' }))
    expect(await screen.findByText(/You have nothing to pay\./)).toBeInTheDocument()
    expect(screen.queryByText('Confirm to make a bill payment.')).not.toBeInTheDocument()
    expect(pay).not.toHaveBeenCalled()
  })

  it('reports a backend 404 as account not found', async () => {
    getAccount.mockRejectedValue(new ApiError('Account not found', 404))
    renderPage()
    await userEvent.type(screen.getByLabelText(/Account ID/), '99999999999')
    await userEvent.click(screen.getByRole('button', { name: 'Look up balance' }))
    expect(await screen.findByText('Account ID NOT found.')).toBeInTheDocument()
  })
})
