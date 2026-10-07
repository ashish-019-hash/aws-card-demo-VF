import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../hooks/useSession'
import { api } from '../services/api'
import type { AccountProfileDto, CreditCardDto, PageResponse } from '../services/api'
import AccountUpdatePage from './AccountUpdatePage'
import AccountViewPage from './AccountViewPage'
import CardDetailPage from './CardDetailPage'
import CardListPage from './CardListPage'
import CardUpdatePage from './CardUpdatePage'

vi.mock('../services/api', () => ({
  api: {
    accounts: { profile: vi.fn(), updateProfile: vi.fn(), get: vi.fn(), update: vi.fn() },
    customers: { get: vi.fn(), update: vi.fn() },
    cards: { list: vi.fn(), byAccount: vi.fn(), get: vi.fn(), update: vi.fn() },
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

afterEach(cleanup)
afterEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
})

/** Backend fixture: account 10 / customer 1 as served by /api/account-profiles. */
const profileDto: AccountProfileDto = {
  account: {
    id: 10,
    version: 3,
    activeStatus: 'Y',
    currentBalance: 1284.5,
    creditLimit: 7500,
    cashCreditLimit: 2500,
    openDate: '2019-03-15',
    expirationDate: '2027-03-31',
    reissueDate: '2024-03-15',
    currentCycleCredit: 450,
    currentCycleDebit: 1734.5,
    addressZip: '78701',
    groupId: 'A000000001',
  },
  customer: {
    id: 1,
    version: 5,
    firstName: 'Sarah',
    middleName: 'J',
    lastName: 'Whitfield',
    addressLine1: '1234 Maple Ave',
    addressLine2: 'Apt 4B',
    addressLine3: 'Austin',
    addressStateCode: 'TX',
    addressCountryCode: 'USA',
    addressZip: '78701',
    phoneNumber1: '5125550147',
    phoneNumber2: '5125550182',
    ssn: 123456789,
    governmentIssuedId: 'TX-DL-48213977',
    dateOfBirth: '1986-07-22',
    eftAccountId: '1234567890',
    primaryCardholderIndicator: 'Y',
    ficoCreditScore: 742,
  },
  cards: [],
}

const cardDto: CreditCardDto = {
  cardNumber: '4000123456789012',
  version: 2,
  accountId: 10,
  cvvCode: 123,
  embossedName: 'SARAH J WHITFIELD',
  expirationDate: '2027-03-09',
  activeStatus: 'Y',
}

const cardPage = (content: CreditCardDto[], number: number, totalPages: number): PageResponse<CreditCardDto> => ({
  content,
  page: { size: 7, number, totalElements: totalPages * 7, totalPages },
})

const sevenCards = Array.from({ length: 7 }, (_, i) => ({
  ...cardDto,
  cardNumber: `400012345678901${i}`,
  accountId: 10 + i,
}))

/** Renders an account/card page with a regular-user session (SCREEN-04..08 are business screens). */
function renderUserPage(ui: ReactNode, { routePath, url }: { routePath: string; url: string }) {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ userId: 'USER0001', userType: 'U' }),
  )
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={routePath} element={ui} />
          <Route path="*" element={<div>other route</div>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('AccountViewPage', () => {
  it('loads the profile from the backend and renders account + customer details', async () => {
    vi.mocked(api.accounts.profile).mockResolvedValue(profileDto)
    renderUserPage(<AccountViewPage />, {
      routePath: '/accounts/view/:accountId?',
      url: '/accounts/view',
    })
    expect(screen.getByRole('heading', { name: 'Account View' })).toBeInTheDocument()
    expect(document.querySelector('[data-screen="COACTVW"]')).not.toBeNull()
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000010')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Sarah J Whitfield')).toBeInTheDocument()
    expect(api.accounts.profile).toHaveBeenCalledWith('00000000010')
    // SSN is masked on the view screen.
    expect(screen.getByText('***-**-6789')).toBeInTheDocument()
    // Numeric backend IDs are padded back to their legacy widths.
    expect(screen.getByText('Account 00000000010')).toBeInTheDocument()
  })

  it('shows the documented not-found error without calling the API for the all-zero account', async () => {
    renderUserPage(<AccountViewPage />, {
      routePath: '/accounts/view/:accountId?',
      url: '/accounts/view/00000000000',
    })
    expect(
      await screen.findByText(
        'Account 00000000000 was not found in the card cross-reference file.',
      ),
    ).toBeInTheDocument()
    expect(api.accounts.profile).not.toHaveBeenCalled()
  })
})

describe('AccountUpdatePage', () => {
  it('saves a customer change through the atomic profile update with both optimistic versions', async () => {
    vi.mocked(api.accounts.profile).mockResolvedValue(profileDto)
    vi.mocked(api.accounts.updateProfile).mockResolvedValue({
      ...profileDto,
      customer: { ...profileDto.customer, version: 6, firstName: 'Sara' },
    })
    renderUserPage(<AccountUpdatePage />, {
      routePath: '/accounts/update/:accountId?',
      url: '/accounts/update/00000000010',
    })
    expect(document.querySelector('[data-screen="COACTUP"]')).not.toBeNull()
    const firstName = await screen.findByLabelText(/First name/)
    await userEvent.clear(firstName)
    await userEvent.type(firstName, 'Sara')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText(/Changes validated\. Save to commit them/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Changes committed to database.')).toBeInTheDocument()
    expect(api.accounts.updateProfile).toHaveBeenCalledWith(
      '00000000010',
      expect.objectContaining({
        account: expect.objectContaining({ version: 3 }),
        customer: expect.objectContaining({ version: 5, firstName: 'Sara', ssn: '123456789' }),
      }),
    )
  })

  it('saves an account change through the atomic profile update with the optimistic version', async () => {
    vi.mocked(api.accounts.profile).mockResolvedValue(profileDto)
    vi.mocked(api.accounts.updateProfile).mockResolvedValue({
      ...profileDto,
      account: { ...profileDto.account, version: 4, creditLimit: 9000 },
    })
    renderUserPage(<AccountUpdatePage />, {
      routePath: '/accounts/update/:accountId?',
      url: '/accounts/update/00000000010',
    })
    const creditLimit = await screen.findByLabelText(/Credit limit/)
    await userEvent.clear(creditLimit)
    await userEvent.type(creditLimit, '9000')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    await screen.findByText(/Changes validated\. Save to commit them/)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Changes committed to database.')).toBeInTheDocument()
    expect(api.accounts.updateProfile).toHaveBeenCalledWith(
      '00000000010',
      expect.objectContaining({
        account: expect.objectContaining({ version: 3, creditLimit: 9000, addressZip: '78701' }),
        customer: expect.objectContaining({ version: 5 }),
      }),
    )
  })

  it('reports no change without calling any update endpoint', async () => {
    vi.mocked(api.accounts.profile).mockResolvedValue(profileDto)
    renderUserPage(<AccountUpdatePage />, {
      routePath: '/accounts/update/:accountId?',
      url: '/accounts/update/00000000010',
    })
    await screen.findByLabelText(/Account group/)
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText('No change detected with respect to values fetched.'),
    ).toBeInTheDocument()
    expect(api.accounts.updateProfile).not.toHaveBeenCalled()
  })
})

describe('CardListPage', () => {
  it('loads a backend page of seven rows and pages with the server metadata', async () => {
    vi.mocked(api.cards.list).mockResolvedValue(cardPage(sevenCards, 0, 3))
    renderUserPage(<CardListPage />, { routePath: '/cards', url: '/cards' })
    expect(screen.getByRole('heading', { name: 'Card List' })).toBeInTheDocument()
    expect(document.querySelector('[data-screen="COCRDLI"]')).not.toBeNull()
    await screen.findAllByText('4000 1234 5678 9010')
    expect(api.cards.list).toHaveBeenCalledWith(0, 7)
    // Table + stacked mobile list both render, so 7 rows appear twice.
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBeGreaterThanOrEqual(7)
    expect(screen.getAllByRole('button', { name: 'Update' }).length).toBeGreaterThanOrEqual(7)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findAllByText('4000 1234 5678 9010')
    expect(api.cards.list).toHaveBeenLastCalledWith(1, 7)
  })

  it('shows the legacy boundary message when Previous is pressed on page 1', async () => {
    vi.mocked(api.cards.list).mockResolvedValue(cardPage(sevenCards, 0, 3))
    renderUserPage(<CardListPage />, { routePath: '/cards', url: '/cards' })
    await screen.findAllByText('4000 1234 5678 9010')
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('NO PREVIOUS PAGES TO DISPLAY')).toBeInTheDocument()
    // The boundary press never re-queries the backend.
    expect(api.cards.list).toHaveBeenCalledTimes(1)
  })

  it('filters by account through the by-account endpoint', async () => {
    vi.mocked(api.cards.list).mockResolvedValue(cardPage(sevenCards, 0, 3))
    vi.mocked(api.cards.byAccount).mockResolvedValue([cardDto])
    renderUserPage(<CardListPage />, { routePath: '/cards', url: '/cards' })
    await screen.findAllByText('4000 1234 5678 9010')
    await userEvent.type(screen.getByLabelText(/Account number/), '00000000010')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await screen.findAllByText('4000 1234 5678 9012')
    expect(api.cards.byAccount).toHaveBeenCalledWith('00000000010')
  })
})

describe('CardDetailPage', () => {
  it('loads the selected card by card number and verifies the account pairing', async () => {
    vi.mocked(api.cards.get).mockResolvedValue(cardDto)
    renderUserPage(<CardDetailPage />, {
      routePath: '/cards/detail/:accountId?/:cardNumber?',
      url: '/cards/detail/00000000010/4000123456789012',
    })
    expect(document.querySelector('[data-screen="COCRDSL"]')).not.toBeNull()
    // Appears in the description list and on the decorative card art.
    expect((await screen.findAllByText('SARAH J WHITFIELD')).length).toBeGreaterThanOrEqual(1)
    // The backend endpoint is keyed by card number alone.
    expect(api.cards.get).toHaveBeenCalledWith('4000123456789012')
    expect(screen.getByRole('button', { name: 'Update this card' })).toBeInTheDocument()
  })

  it('reports the legacy miss message when the account does not own the card', async () => {
    vi.mocked(api.cards.get).mockResolvedValue(cardDto)
    renderUserPage(<CardDetailPage />, {
      routePath: '/cards/detail/:accountId?/:cardNumber?',
      url: '/cards/detail/00000000099/4000123456789012',
    })
    expect(
      await screen.findByText('Did not find this account/card combination.'),
    ).toBeInTheDocument()
  })
})

describe('CardUpdatePage', () => {
  it('walks validate → save and sends the optimistic version with the rebuilt expiry date', async () => {
    vi.mocked(api.cards.get).mockResolvedValue(cardDto)
    vi.mocked(api.cards.update).mockResolvedValue({
      ...cardDto,
      version: 3,
      embossedName: 'SARAH J WHITFIELD JR',
    })
    renderUserPage(<CardUpdatePage />, {
      routePath: '/cards/update/:accountId?/:cardNumber?',
      url: '/cards/update/00000000010/4000123456789012',
    })
    expect(document.querySelector('[data-screen="COCRDUP"]')).not.toBeNull()
    const name = await screen.findByLabelText(/Embossed name/)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.type(name, ' JR')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText(/Changes validated\. Save to commit them/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Changes committed to database.')).toBeInTheDocument()
    expect(api.cards.update).toHaveBeenCalledWith(
      '4000123456789012',
      expect.objectContaining({
        version: 2,
        accountId: 10,
        cvvCode: 123,
        embossedName: 'SARAH J WHITFIELD JR',
        // Month/year come from the form; the stored day of month is preserved.
        expirationDate: '2027-03-09',
        activeStatus: 'Y',
      }),
    )
  })
})
