import { apiRequest, clearApiSession } from './client'
import type {
  AccountDto,
  AccountProfileDto,
  AccountProfileUpdateRequest,
  AccountUpdateRequest,
  BillPaymentResponse,
  CreditCardDto,
  CreditCardUpdateRequest,
  CustomerDto,
  CustomerUpdateRequest,
  LoginResponse,
  PageResponse,
  ReportRequest,
  ReportResponse,
  TransactionDto,
  TransactionRequest,
  UserDto,
  UserRequest,
} from './contracts'

const json = (value: unknown) => JSON.stringify(value)
const pageQuery = (page: number, size: number, sort?: string) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) query.set('sort', sort)
  return query
}

export const api = {
  auth: {
    login: (userId: string, password: string) =>
      apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: json({ userId, password }),
      }),
    logout: async () => {
      try {
        await apiRequest<void>('/api/auth/logout', { method: 'POST' })
      } finally {
        clearApiSession()
      }
    },
  },
  accounts: {
    profile: (accountId: string) => apiRequest<AccountProfileDto>(`/api/account-profiles/${accountId}`),
    updateProfile: (accountId: string, request: AccountProfileUpdateRequest) =>
      apiRequest<AccountProfileDto>(`/api/account-profiles/${accountId}`, {
        method: 'PUT',
        body: json(request),
      }),
    get: (accountId: string) => apiRequest<AccountDto>(`/api/accounts/${accountId}`),
    update: (accountId: string, request: AccountUpdateRequest) =>
      apiRequest<AccountDto>(`/api/accounts/${accountId}`, { method: 'PUT', body: json(request) }),
  },
  customers: {
    get: (customerId: string) => apiRequest<CustomerDto>(`/api/customers/${customerId}`),
    update: (customerId: string, request: CustomerUpdateRequest) =>
      apiRequest<CustomerDto>(`/api/customers/${customerId}`, { method: 'PUT', body: json(request) }),
  },
  cards: {
    list: (page: number, size: number) =>
      apiRequest<PageResponse<CreditCardDto>>(`/api/cards?${pageQuery(page, size, 'cardNumber,asc')}`),
    byAccount: (accountId: string) =>
      apiRequest<CreditCardDto[]>(`/api/cards?accountId=${encodeURIComponent(accountId)}`),
    get: (cardNumber: string) => apiRequest<CreditCardDto>(`/api/cards/${cardNumber}`),
    update: (cardNumber: string, request: CreditCardUpdateRequest) =>
      apiRequest<CreditCardDto>(`/api/cards/${cardNumber}`, { method: 'PUT', body: json(request) }),
  },
  transactions: {
    list: (page: number, size: number) =>
      apiRequest<PageResponse<TransactionDto>>(`/api/transactions?${pageQuery(page, size, 'id,asc')}`),
    get: (id: string) => apiRequest<TransactionDto>(`/api/transactions/${id}`),
    create: (request: TransactionRequest) =>
      apiRequest<TransactionDto>('/api/transactions', { method: 'POST', body: json(request) }),
  },
  billing: {
    pay: (accountId: string, confirmation: 'Y' | 'N') =>
      apiRequest<BillPaymentResponse>('/api/bill-payments', {
        method: 'POST',
        body: json({ accountId: Number(accountId), confirmation }),
      }),
  },
  reports: {
    create: (request: ReportRequest) =>
      apiRequest<ReportResponse>('/api/reports/transactions', { method: 'POST', body: json(request) }),
  },
  users: {
    list: (page: number, size: number) =>
      apiRequest<PageResponse<UserDto>>(`/api/users?${pageQuery(page, size, 'id,asc')}`),
    get: (id: string) => apiRequest<UserDto>(`/api/users/${id}`),
    create: (id: string, request: UserRequest) =>
      apiRequest<UserDto>(`/api/users/${id}`, { method: 'POST', body: json(request) }),
    update: (id: string, request: UserRequest) =>
      apiRequest<UserDto>(`/api/users/${id}`, { method: 'PUT', body: json(request) }),
    delete: (id: string) => apiRequest<void>(`/api/users/${id}`, { method: 'DELETE' }),
  },
}

export { ApiError } from './client'
export type * from './contracts'
