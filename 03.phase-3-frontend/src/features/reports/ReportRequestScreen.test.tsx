import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../../hooks/useSession'
import { TransactionReportsPage } from '../../pages/TransactionReportsPage'
import { ApiError, api, type ReportResponse, type TransactionDto } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    reports: { create: vi.fn() },
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

const createReport = vi.mocked(api.reports.create)

function transactionDto(idSuffix: string): TransactionDto {
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
    originationTimestamp: '2026-10-05 14:22:08',
    processingTimestamp: '2026-10-06 02:00:00',
  }
}

function reportResponse(overrides: Partial<ReportResponse> = {}): ReportResponse {
  return {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    transactions: [transactionDto('101'), transactionDto('102')],
    formatterStatus: 'CBTRN03C formatter source is absent; this response contains the source-backed filtered transaction set',
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
      <MemoryRouter initialEntries={['/reports']}>
        <TransactionReportsPage />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('TransactionReportsPage', () => {
  it('renders the heading with the legacy screen code', () => {
    const { container } = renderPage()
    expect(screen.getByRole('heading', { name: 'Transaction Reports' })).toBeInTheDocument()
    expect(container.querySelector('[data-screen="CORPT00"]')).not.toBeNull()
  })

  it('asks for a report type when none is selected', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    expect(await screen.findByText('Select a report type to print report.')).toBeInTheDocument()
    expect(createReport).not.toHaveBeenCalled()
  })

  it('reveals the custom date range only for the Custom type', async () => {
    renderPage()
    expect(screen.queryByLabelText(/Start date/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    expect(screen.getByLabelText(/Start date/)).toBeInTheDocument()
    expect(screen.getByLabelText(/End date/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Monthly/ }))
    expect(screen.queryByLabelText(/Start date/)).not.toBeInTheDocument()
  })

  it('blocks a custom report with blank dates using the legacy component messages (RULE-VAL-070)', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    expect(await screen.findByText('Start Date - Month can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('End Date - Month can NOT be empty.')).toBeInTheDocument()
    expect(screen.queryByText(/Please confirm to print/)).not.toBeInTheDocument()
    expect(createReport).not.toHaveBeenCalled()
  })

  it('blocks a custom report with out-of-range or impossible dates (RULE-VAL-071/072)', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    await userEvent.type(screen.getByLabelText(/Start date/), '2026-13-01')
    await userEvent.type(screen.getByLabelText(/End date/), '2026-02-30')
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    expect(await screen.findByText('Start Date - Not a valid Month.')).toBeInTheDocument()
    expect(screen.getByText('End Date - Not a valid date.')).toBeInTheDocument()
    expect(screen.queryByText(/Please confirm to print/)).not.toBeInTheDocument()
    expect(createReport).not.toHaveBeenCalled()
  })

  it('submits a monthly report and shows the backend period, count and formatter status', async () => {
    createReport.mockResolvedValue(reportResponse())
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Monthly/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    expect(await screen.findByText('Please confirm to print the Monthly report.')).toBeInTheDocument()
    expect(createReport).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, print report' }))
    // The copy must be honest: the selection is prepared, but nothing is
    // printed because the CBTRN03C formatter source is missing.
    expect(
      await screen.findByText(
        'Monthly report selection prepared. Printing is unavailable because the legacy formatter source (CBTRN03C) is missing.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Please confirm to print the Monthly report.')).not.toBeInTheDocument()
    expect(createReport).toHaveBeenCalledWith({ type: 'MONTHLY', confirmation: 'Y' })

    // The result card reflects the backend response.
    expect(screen.getByText('2026-10-01 to 2026-10-31')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/CBTRN03C formatter source is absent/)).toBeInTheDocument()
  })

  it('sends the entered custom dates with the request', async () => {
    createReport.mockResolvedValue(reportResponse({ startDate: '2026-09-01', endDate: '2026-09-15', transactions: [] }))
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    await userEvent.type(screen.getByLabelText(/Start date/), '2026-09-01')
    await userEvent.type(screen.getByLabelText(/End date/), '2026-09-15')
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, print report' }))
    expect(
      await screen.findByText(
        'Custom report selection prepared. Printing is unavailable because the legacy formatter source (CBTRN03C) is missing.',
      ),
    ).toBeInTheDocument()
    expect(createReport).toHaveBeenCalledWith({
      type: 'CUSTOM',
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      confirmation: 'Y',
    })
    expect(screen.getByText('2026-09-01 to 2026-09-15')).toBeInTheDocument()
  })

  it('shows the backend error and keeps the selection when the request is rejected', async () => {
    createReport.mockRejectedValue(new ApiError('Report start date must not follow end date', 400))
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Monthly/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, print report' }))
    expect(await screen.findByText('Report start date must not follow end date')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Monthly/ })).toBeChecked()
  })

  it('resets the form when the confirmation is declined', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /Yearly/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Request report' }))
    await userEvent.click(screen.getByRole('button', { name: 'No, go back' }))
    expect(screen.queryByText('Please confirm to print the Yearly report.')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Yearly/ })).not.toBeChecked()
    expect(createReport).not.toHaveBeenCalled()
  })
})
