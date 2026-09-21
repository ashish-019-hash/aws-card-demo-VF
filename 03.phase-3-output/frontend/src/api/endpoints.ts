import { api } from './client'
import type {
  AccountUpdateRequest,
  AccountUpdateResponse,
  AccountView,
  BillPaymentRequest,
  BillPaymentResponse,
  CardDetail,
  CardListResponse,
  CardUpdateRequest,
  CardUpdateResponse,
  MenuResponse,
  ReportRequest,
  ReportResponse,
  SessionResponse,
  SignOnRequest,
  TransactionAddRequest,
  TransactionAddResponse,
  TransactionDetail,
  TransactionListResponse,
  UserListResponse,
  UserRequest,
  UserResponse,
} from './types'

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}

export const endpoints = {
  signOn: (body: SignOnRequest) => api.post<SessionResponse>('/api/session', body),
  currentSession: () => api.get<SessionResponse>('/api/session'),
  signOff: () => api.delete<void>('/api/session'),

  menu: () => api.get<MenuResponse>('/api/menu'),

  getAccount: (id: string | number) => api.get<AccountView>(`/api/accounts/${id}`),
  updateAccount: (id: string | number, body: AccountUpdateRequest) =>
    api.put<AccountUpdateResponse>(`/api/accounts/${id}`, body),

  listCards: (params: { acctId?: string; cardNum?: string; page?: number }) =>
    api.get<CardListResponse>(`/api/cards${qs(params)}`),
  getCard: (cardNumber: string) => api.get<CardDetail>(`/api/cards/${cardNumber}`),
  updateCard: (cardNumber: string, body: CardUpdateRequest) =>
    api.put<CardUpdateResponse>(`/api/cards/${cardNumber}`, body),

  listTransactions: (params: { startId?: string; page?: number }) =>
    api.get<TransactionListResponse>(`/api/transactions${qs(params)}`),
  getTransaction: (id: string) => api.get<TransactionDetail>(`/api/transactions/${id}`),
  getLastTransaction: (cardNum: string) =>
    api.get<TransactionDetail>(`/api/transactions/last${qs({ cardNum })}`),
  addTransaction: (body: TransactionAddRequest) => api.post<TransactionAddResponse>('/api/transactions', body),

  payBill: (body: BillPaymentRequest) => api.post<BillPaymentResponse>('/api/bill-payments', body),

  submitReport: (body: ReportRequest) => api.post<ReportResponse>('/api/reports', body),

  listUsers: (params: { page?: number }) => api.get<UserListResponse>(`/api/users${qs(params)}`),
  getUser: (userId: string) => api.get<UserResponse>(`/api/users/${userId}`),
  createUser: (body: UserRequest) => api.post<UserResponse>('/api/users', body),
  updateUser: (userId: string, body: UserRequest) => api.put<UserResponse>(`/api/users/${userId}`, body),
  deleteUser: (userId: string) => api.delete<void>(`/api/users/${userId}`),
}
