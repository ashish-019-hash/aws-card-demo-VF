import { afterEach, beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AccountUpdatePage } from '../pages/AccountPages'
import { CardUpdatePage } from '../pages/CardPages'
import { resetAuthentication, server, setAuthenticated } from './server'

const account = {
  accountId: 1,
  version: 4,
  activeStatus: 'Y',
  currentBalance: 194,
  creditLimit: 1000,
  cashCreditLimit: 100,
  openDate: '2020-01-01',
  expirationDate: '2028-12-01',
  reissueDate: '2024-01-01',
  currentCycleCredit: 0,
  currentCycleDebit: 0,
  addressZip: '02108',
  accountGroupId: 'GROUP1',
  cards: [],
  customer: {
    customerId: 1,
    version: 6,
    firstName: 'Ada',
    middleName: '',
    lastName: 'Lovelace',
    addressLine1: '1 Main St',
    addressLine2: '',
    city: 'Boston',
    addressStateCode: 'MA',
    addressCountryCode: 'USA',
    addressZip: '02108',
    primaryPhoneNumber: '',
    secondaryPhoneNumber: '',
    ssn: '111223333',
    governmentIssuedId: '',
    dateOfBirth: '1980-01-01',
    eftAccountId: '123',
    primaryCardHolderIndicator: 'Y',
    ficoCreditScore: 750,
  },
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetAuthentication()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

describe('optimistic write versions', () => {
  beforeEach(() => setAuthenticated())
  it('sends independent account/customer versions and refetches after account save', async () => {
    const saved = vi.fn()
    let gets = 0
    server.use(
      http.get('/api/accounts/1', () => {
        gets += 1
        return HttpResponse.json({
          ...account,
          version: gets === 1 ? 4 : 5,
          customer: { ...account.customer, version: gets === 1 ? 6 : 7 },
        })
      }),
      http.put('/api/accounts/1', async ({ request }) => {
        saved(await request.json())
        return HttpResponse.json({ changed: true })
      }),
    )
    render(
      <MemoryRouter initialEntries={['/accounts/update?id=1']}>
        <AccountUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(saved.mock.calls[0][0]).toMatchObject({
      expectedAccountVersion: 4,
      expectedCustomerVersion: 6,
      addressZip: '02108',
      customer: { addressZip: '02108' },
    })
    expect(saved.mock.calls[0][0].customer).not.toHaveProperty('customerId')
    expect(saved.mock.calls[0][0].customer).not.toHaveProperty('version')
    await screen.findByText(/Current versions were refreshed/)
    expect(gets).toBe(2)
  })

  it('reloads current account state and asks for review after a stale write', async () => {
    let gets = 0
    server.use(
      http.get('/api/accounts/1', () => {
        gets += 1
        return HttpResponse.json({
          ...account,
          version: gets === 1 ? 4 : 5,
          customer: { ...account.customer, version: gets === 1 ? 6 : 7 },
        })
      }),
      http.put('/api/accounts/1', () =>
        HttpResponse.json({ code: 'STALE_WRITE', message: 'A newer version exists.' }, { status: 409 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/accounts/update?id=1']}>
        <AccountUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Current details were reloaded')
    expect(gets).toBe(2)
  })

  it('sends the card version and refetches after card save', async () => {
    const saved = vi.fn()
    let gets = 0
    server.use(
      http.get('/api/cards/1111111111111111', () => {
        gets += 1
        return HttpResponse.json({
          cardNumber: '1111111111111111',
          accountId: 1,
          embossedName: 'Ada Lovelace',
          activeStatus: 'Y',
          expirationDate: '2028-01-01',
          cvvCode: 123,
          version: gets === 1 ? 3 : 4,
        })
      }),
      http.put('/api/cards/1111111111111111', async ({ request }) => {
        saved(await request.json())
        return HttpResponse.json({ changed: true })
      }),
    )
    render(
      <MemoryRouter initialEntries={['/cards/update?card=1111111111111111']}>
        <CardUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada Lovelace')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(saved.mock.calls[0][0]).toMatchObject({ expectedVersion: 3 })
    await screen.findByText(/Current version was refreshed/)
    expect(gets).toBe(2)
  })

  it('reloads current card state and asks for review after a stale write', async () => {
    let gets = 0
    server.use(
      http.get('/api/cards/1111111111111111', () => {
        gets += 1
        return HttpResponse.json({
          cardNumber: '1111111111111111',
          accountId: 1,
          embossedName: 'Ada Lovelace',
          activeStatus: 'Y',
          expirationDate: '2028-01-01',
          cvvCode: 123,
          version: gets === 1 ? 3 : 4,
        })
      }),
      http.put('/api/cards/1111111111111111', () =>
        HttpResponse.json({ code: 'STALE_WRITE', message: 'A newer version exists.' }, { status: 409 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/cards/update?card=1111111111111111']}>
        <CardUpdatePage />
      </MemoryRouter>,
    )
    await screen.findByDisplayValue('Ada Lovelace')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Current details were reloaded')
    expect(gets).toBe(2)
  })
})
