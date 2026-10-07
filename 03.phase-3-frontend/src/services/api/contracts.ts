export interface PageResponse<T> {
  content: T[]
  page: {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }
}

export interface LoginResponse {
  userId: string
  userType: 'A' | 'U'
  entryPoint: 'ADMIN_MENU' | 'MAIN_MENU'
}

export interface AccountDto {
  id: number
  version: number
  activeStatus: 'Y' | 'N'
  currentBalance: number
  creditLimit: number
  cashCreditLimit: number
  openDate: string
  expirationDate: string
  reissueDate: string
  currentCycleCredit: number
  currentCycleDebit: number
  addressZip: string
  groupId: string
}

export interface CustomerDto {
  id: number
  version: number
  firstName: string
  middleName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  addressStateCode: string
  addressCountryCode: string
  addressZip: string
  phoneNumber1: string
  phoneNumber2: string
  ssn: number
  governmentIssuedId: string
  dateOfBirth: string
  eftAccountId: string
  primaryCardholderIndicator: 'Y' | 'N'
  ficoCreditScore: number
}

export interface CreditCardDto {
  cardNumber: string
  version: number
  accountId: number
  cvvCode: number
  embossedName: string
  expirationDate: string
  activeStatus: 'Y' | 'N'
}

export interface AccountProfileDto {
  account: AccountDto
  customer: CustomerDto
  cards: CreditCardDto[]
}

export interface TransactionDto {
  id: string
  transactionTypeCode: string
  transactionCategoryCode: number
  source: string
  description: string
  amount: number
  merchantId: number
  merchantName: string
  merchantCity: string
  merchantZip: string
  cardNumber: string
  originationTimestamp: string
  processingTimestamp: string
}

export interface UserDto {
  id: string
  firstName: string
  lastName: string
  userType: 'A' | 'U'
}

export interface BillPaymentResponse {
  accountId: number
  cardNumber: string
  transactionId: string
  amount: number
  resultingBalance: number
}

export interface ReportResponse {
  startDate: string
  endDate: string
  transactions: TransactionDto[]
  formatterStatus: string
}

export interface AccountUpdateRequest extends Omit<AccountDto, 'id'> {}
export interface CustomerUpdateRequest extends Omit<CustomerDto, 'id' | 'ssn'> {
  ssn: string
}
/** Atomic SCREEN-05 save: account + customer commit or roll back together. */
export interface AccountProfileUpdateRequest {
  account: AccountUpdateRequest
  customer: CustomerUpdateRequest
}
export interface CreditCardUpdateRequest extends Omit<CreditCardDto, 'cardNumber'> {}
export interface UserRequest extends Omit<UserDto, 'id'> {
  password: string
}

export interface TransactionRequest extends Omit<TransactionDto, 'amount' | 'merchantId' | 'transactionCategoryCode'> {
  accountId?: number
  amount: string
  merchantId: string
  transactionCategoryCode: number
  confirmation: 'Y' | 'N'
}

export interface ReportRequest {
  type: 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  startDate?: string
  endDate?: string
  confirmation: 'Y' | 'N'
}
