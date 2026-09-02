export type Role = 'ADMINISTRATOR' | 'USER'
export interface Session {
  userId: string
  role: Role
  destination: string
}
export interface ApiError {
  code: string
  message: string
  ruleId?: string
  field?: string
}
export interface Page<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
  size: number
  first: boolean
  last: boolean
}
export interface Customer {
  customerId: number
  version: number
  firstName: string
  middleName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  city: string
  addressStateCode: string
  addressCountryCode: string
  addressZip: string
  primaryPhoneNumber: string
  secondaryPhoneNumber: string
  ssn: string
  governmentIssuedId: string
  dateOfBirth: string
  eftAccountId: string
  primaryCardHolderIndicator: string
  ficoCreditScore: number
}
export interface CardSummary {
  cardNumber: string
  accountId: number
  embossedName: string
  activeStatus: string
  expirationDate: string
}
export interface Card extends CardSummary {
  cvvCode: number
  version: number
}
export interface Account {
  accountId: number
  version: number
  activeStatus: string
  currentBalance: number
  creditLimit: number
  cashCreditLimit: number
  openDate: string
  expirationDate: string
  reissueDate: string
  currentCycleCredit: number
  currentCycleDebit: number
  addressZip: string
  accountGroupId: string
  cards: CardSummary[]
  customer: Customer
}
export interface Transaction {
  transactionId: string
  cardNumber: string
  transactionTypeCode: string
  transactionCategoryCode: number
  source: string
  description: string
  amount: number
  merchantId: number
  merchantName: string
  merchantCity: string
  merchantZip: string
  originalTimestamp: string
  processingTimestamp: string
}
export interface ApplicationUser {
  userId: string
  firstName: string
  lastName: string
  userType: string
}
export type ReportType = 'MONTHLY' | 'YEARLY' | 'CUSTOM'
export interface Report {
  requestId: number
  status: string
  type: ReportType
  startDate: string
  endDate: string
  transactions: Transaction[]
}
