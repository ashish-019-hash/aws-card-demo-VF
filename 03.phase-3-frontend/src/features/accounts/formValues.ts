import type { AccountUpdateFormValues } from '../../validation/accountUpdate'
import type { AccountProfile } from './service'

export type UpdatePhase = 'editing' | 'validated' | 'saving' | 'saved'

/** Maps a fetched profile onto the editable field set of SCREEN-05. */
export function profileToFormValues(profile: AccountProfile): AccountUpdateFormValues {
  const { account, customer } = profile
  return {
    activeStatus: account.activeStatus,
    openDate: account.openDate,
    expirationDate: account.expirationDate,
    reissueDate: account.reissueDate,
    creditLimit: account.creditLimit,
    cashCreditLimit: account.cashCreditLimit,
    currentBalance: account.currentBalance,
    currentCycleCredit: account.currentCycleCredit,
    currentCycleDebit: account.currentCycleDebit,
    groupId: account.groupId,
    firstName: customer.firstName,
    middleName: customer.middleName,
    lastName: customer.lastName,
    ssn: customer.ssn,
    dateOfBirth: customer.dateOfBirth,
    ficoCreditScore: customer.ficoCreditScore,
    addressLine1: customer.addressLine1,
    addressLine2: customer.addressLine2,
    addressLine3: customer.addressLine3,
    addressStateCode: customer.addressStateCode,
    addressZip: customer.addressZip,
    addressCountryCode: customer.addressCountryCode,
    phoneNumber1: customer.phoneNumber1,
    phoneNumber2: customer.phoneNumber2,
    governmentIssuedId: customer.governmentIssuedId,
    eftAccountId: customer.eftAccountId,
    primaryCardholderIndicator: customer.primaryCardholderIndicator,
  }
}

/** True when any editable field differs from the fetched baseline. */
export function valuesDiffer(a: AccountUpdateFormValues, b: AccountUpdateFormValues): boolean {
  return (Object.keys(a) as Array<keyof AccountUpdateFormValues>).some(
    (key) => (a[key] ?? '') !== (b[key] ?? ''),
  )
}
