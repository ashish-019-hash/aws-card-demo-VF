import { del, get, post, put } from './client'
import type {
  Account,
  ApplicationUser,
  Card,
  CardSummary,
  Page,
  Report,
  ReportType,
  Session,
  Transaction,
} from './types'

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const result = params.toString()
  return result ? `?${result}` : ''
}

export const sessionApi = {
  signIn: (userId: string, password: string) => post<Session>('/api/session', { userId, password }),
  csrf: () => get<{ token: string }>('/api/csrf'),
  /** /api/menu is the authenticated session probe and returns the session's user capabilities. */
  restore: () => get<{ menu: string }>('/api/menu'),
  adminMenu: () => get<{ menu: string }>('/api/admin/menu'),
  logout: () => post<void>('/api/session/logout', {}),
}
export const accountApi = {
  get: (id: string) => get<Account>(`/api/accounts/${encodeURIComponent(id)}`),
  update: (id: number, input: unknown) => put<{ changed: boolean }>(`/api/accounts/${id}`, input),
  pay: (id: string, confirmation: string) =>
    post<{ status: string; paidAmount: number; newBalance: number; transaction: Transaction }>(
      `/api/accounts/${id}/payments`,
      { confirmation },
    ),
}
export const cardApi = {
  list: (filters: { accountId?: string; cardNumber?: string; page?: number; size?: number }) =>
    get<Page<CardSummary>>(`/api/cards${query(filters)}`),
  get: (cardNumber: string) => get<Card>(`/api/cards/${encodeURIComponent(cardNumber)}`),
  update: (cardNumber: string, input: unknown) =>
    put<{ changed: boolean }>(`/api/cards/${encodeURIComponent(cardNumber)}`, input),
}
export const transactionApi = {
  list: (filters: { fromTransactionId?: string; page?: number; size?: number }) =>
    get<Page<Transaction>>(`/api/transactions${query(filters)}`),
  get: (id: string) => get<Transaction>(`/api/transactions/${encodeURIComponent(id)}`),
  add: (input: unknown) => post<{ status: string; transaction: Transaction }>('/api/transactions', input),
}
export const userApi = {
  list: (filters: { startsWith?: string; page?: number; size?: number }) =>
    get<Page<ApplicationUser>>(`/api/users${query(filters)}`),
  get: (id: string) => get<ApplicationUser>(`/api/users/${encodeURIComponent(id)}`),
  add: (input: unknown) => post<ApplicationUser>('/api/users', input),
  update: (id: string, input: unknown) => put<{ changed: boolean }>(`/api/users/${encodeURIComponent(id)}`, input),
  delete: (id: string) => del<void>(`/api/users/${encodeURIComponent(id)}`),
}
export const reportApi = {
  request: (type: ReportType, startDate: string, endDate: string, confirmation: string) =>
    post<Report>('/api/reports/requests', {
      type,
      startDate: startDate || null,
      endDate: endDate || null,
      confirmation,
    }),
  get: (id: string) => get<Report>(`/api/reports/requests/${id}`),
  transactions: (startDate: string, endDate: string) =>
    get<Report>(`/api/reports/transactions${query({ startDate, endDate })}`),
}
