import { http, HttpResponse } from 'msw'

let authenticated = false
export const resetAuthentication = () => {
  authenticated = false
}
export const setAuthenticated = () => {
  authenticated = true
}
const account = {
  accountId: 1,
  version: 0,
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
    version: 0,
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
export const handlers = [
  http.post('/api/session', () => {
    authenticated = true
    return HttpResponse.json({ userId: 'USER0001', role: 'USER', destination: '/api/menu' })
  }),
  http.get('/api/csrf', () =>
    authenticated
      ? HttpResponse.json({ token: 'test' })
      : HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Sign in required' }, { status: 401 }),
  ),
  http.get('/api/accounts/:id', () => HttpResponse.json(account)),
  http.get('/api/cards', () =>
    HttpResponse.json({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 10, first: true, last: true }),
  ),
  http.get('/api/transactions', () =>
    HttpResponse.json({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 10, first: true, last: true }),
  ),
]
