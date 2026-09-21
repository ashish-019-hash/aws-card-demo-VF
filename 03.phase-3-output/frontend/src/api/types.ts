// Request/response shapes mirrored from the live backend OpenAPI document
// (http://localhost:8080/v3/api-docs) and 02.phase-2-output/backend/docs/api-contract.md.
// Do not add fields the backend does not expose.

export interface SignOnRequest {
  userId: string
  password: string
}

export interface SessionResponse {
  authenticated: boolean
  userId: string | null
  firstName: string | null
  lastName: string | null
  userType: 'A' | 'U' | null
}

export interface MenuOption {
  number: number
  label: string
  targetScreen: string
}

export interface MenuResponse {
  userType: string
  options: MenuOption[]
}

export interface AccountFields {
  activeStatus: string | null
  creditLimit: number | null
  cashCreditLimit: number | null
  currBal: number | null
  currCycCredit: number | null
  currCycDebit: number | null
  openDate: string | null
  expirationDate: string | null
  reissueDate: string | null
  groupId: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  addrLine1: string | null
  addrLine2: string | null
  addrLine3: string | null
  addrStateCd: string | null
  addrCountryCd: string | null
  addrZip: string | null
  phoneNum1: string | null
  phoneNum2: string | null
  ssn: string | null
  govtIssuedId: string | null
  dob: string | null
  eftAccountId: string | null
  priCardHolderInd: string | null
  ficoCreditScore: number | null
}

export interface AccountView {
  acctId: number
  custId: number
  cardNum: string
  fields: AccountFields
}

export interface AccountUpdateRequest {
  expected: AccountFields
  updated: AccountFields
}

export interface AccountUpdateResponse {
  changed: boolean
  account: AccountView
}

export interface CardFields {
  cvvCd: number | null
  embossedName: string | null
  expirationDate: string | null
  activeStatus: string | null
}

export interface CardDetail {
  cardNum: string
  acctId: number
  fields: CardFields
}

export interface CardSummary {
  cardNum: string
  acctId: number
  embossedName: string | null
  activeStatus: string | null
}

export interface CardListResponse {
  items: CardSummary[]
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface CardUpdateRequest {
  expected: CardFields
  updated: CardFields
}

export interface CardUpdateResponse {
  changed: boolean
  card: CardDetail
}

export interface TransactionSummary {
  tranId: string
  origTs: string | null
  description: string | null
  amount: number | null
}

export interface TransactionListResponse {
  items: TransactionSummary[]
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface TransactionDetail {
  tranId: string
  cardNum: string | null
  typeCd: string | null
  catCd: number | null
  source: string | null
  description: string | null
  amount: number | null
  origTs: string | null
  procTs: string | null
  merchantId: number | null
  merchantName: string | null
  merchantCity: string | null
  merchantZip: string | null
}

export interface TransactionAddRequest {
  accountId: number | null
  cardNum: string | null
  typeCd: string
  catCd: number
  source: string
  description: string
  amount: number
  origDate: string
  procDate: string
  merchantId: number
  merchantName: string
  merchantCity: string
  merchantZip: string
  confirm: string
}

export interface TransactionAddResponse {
  tranId: string
  transaction: TransactionDetail
}

export interface BillPaymentRequest {
  accountId: number | null
  confirm: string
}

export interface BillPaymentResponse {
  paid: boolean
  tranId: string | null
  amountPaid: number | null
  newBalance: number | null
  message: string | null
}

export interface ReportRequest {
  reportType: 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  startDate?: string | null
  endDate?: string | null
  confirm: string
}

export interface ReportResponse {
  submitted: boolean
  periodStart: string | null
  periodEnd: string | null
  message: string | null
}

export interface UserSummary {
  userId: string
  firstName: string | null
  lastName: string | null
  userType: string | null
}

export interface UserListResponse {
  items: UserSummary[]
  hasNext: boolean
  hasPrevious: boolean
}

export interface UserResponse {
  userId: string
  firstName: string | null
  lastName: string | null
  userType: string | null
}

export interface UserRequest {
  userId: string
  firstName: string
  lastName: string
  password: string
  userType: string
}

// Shared error envelope (api-contract.md "Error envelope").
export interface ApiFieldError {
  field: string
  rule: string
  message: string
}

export interface ApiErrorBody {
  code: 'VALIDATION_FAILED' | 'NOT_FOUND' | 'CONFLICT' | 'UNAUTHORIZED' | 'FORBIDDEN' | string
  message: string
  errors?: ApiFieldError[]
}
