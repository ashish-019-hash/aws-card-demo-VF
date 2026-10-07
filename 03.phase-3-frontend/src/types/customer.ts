/** Customer view model (ENTITY-001). Field names follow the backend DTOs. */
export interface Customer {
  /** 9-digit customer number (CUST-ID). */
  id: string
  /** Optimistic-locking record version; echoed back on updates. */
  version: number
  firstName: string
  middleName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  /** City (legacy address line 3). */
  addressLine3: string
  addressStateCode: string
  addressCountryCode: string
  addressZip: string
  phoneNumber1: string
  phoneNumber2: string
  /** 9-digit SSN, digits only. */
  ssn: string
  governmentIssuedId: string
  /** YYYY-MM-DD. */
  dateOfBirth: string
  eftAccountId: string
  primaryCardholderIndicator: 'Y' | 'N'
  ficoCreditScore: string
}
