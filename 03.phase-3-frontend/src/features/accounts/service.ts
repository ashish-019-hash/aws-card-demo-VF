/**
 * Step 3 — account servicing against the real backend (SCREEN-04/05).
 * Maps the numeric backend DTOs onto the string-based display types and
 * keeps the shape-level input checks the preview helpers used to apply.
 */
import { ApiError, api } from '../../services/api'
import type {
  AccountDto,
  AccountUpdateRequest,
  CustomerDto,
  CustomerUpdateRequest,
} from '../../services/api'
import type { Account } from '../../types/account'
import type { Customer } from '../../types/customer'
import type { AccountUpdateFormValues } from '../../validation/accountUpdate'
import { accountMessages } from './messages'

export type LookupResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface AccountProfile {
  account: Account
  customer: Customer
}

/** Shown when the request itself fails (network down, server error without detail). */
export const serviceUnavailableMessage =
  'The account service is not available right now. Try again.'

const toMoney = (value: number) => value.toFixed(2)
const padId = (id: number, width: number) => String(id).padStart(width, '0')

export function toAccount(dto: AccountDto): Account {
  return {
    id: padId(dto.id, 11),
    version: dto.version,
    activeStatus: dto.activeStatus,
    currentBalance: toMoney(dto.currentBalance),
    creditLimit: toMoney(dto.creditLimit),
    cashCreditLimit: toMoney(dto.cashCreditLimit),
    openDate: dto.openDate,
    expirationDate: dto.expirationDate,
    reissueDate: dto.reissueDate,
    currentCycleCredit: toMoney(dto.currentCycleCredit),
    currentCycleDebit: toMoney(dto.currentCycleDebit),
    addressZip: dto.addressZip,
    groupId: dto.groupId,
  }
}

export function toCustomer(dto: CustomerDto): Customer {
  return {
    id: padId(dto.id, 9),
    version: dto.version,
    firstName: dto.firstName,
    middleName: dto.middleName,
    lastName: dto.lastName,
    addressLine1: dto.addressLine1,
    addressLine2: dto.addressLine2,
    addressLine3: dto.addressLine3,
    addressStateCode: dto.addressStateCode,
    addressCountryCode: dto.addressCountryCode,
    addressZip: dto.addressZip,
    phoneNumber1: dto.phoneNumber1,
    phoneNumber2: dto.phoneNumber2,
    ssn: String(dto.ssn).padStart(9, '0'),
    governmentIssuedId: dto.governmentIssuedId,
    dateOfBirth: dto.dateOfBirth,
    eftAccountId: dto.eftAccountId,
    primaryCardholderIndicator: dto.primaryCardholderIndicator,
    ficoCreditScore: String(dto.ficoCreditScore),
  }
}

function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : serviceUnavailableMessage
}

/**
 * Fetch one account profile (account + customer) from the backend.
 * Keeps the preview-era shape checks: 11 digits, not all zeroes.
 */
export async function fetchAccountProfile(
  accountId: string,
): Promise<LookupResult<AccountProfile>> {
  const trimmed = accountId.trim()
  if (!/^\d{11}$/.test(trimmed)) {
    return { ok: false, message: accountMessages.invalidAccountNumber }
  }
  if (/^0{11}$/.test(trimmed)) {
    return { ok: false, message: accountMessages.accountNotFound(trimmed) }
  }
  try {
    const profile = await api.accounts.profile(trimmed)
    return {
      ok: true,
      data: { account: toAccount(profile.account), customer: toCustomer(profile.customer) },
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { ok: false, message: accountMessages.accountNotFound(trimmed) }
    }
    return { ok: false, message: failureMessage(error) }
  }
}

function toAccountUpdateRequest(
  account: Account,
  values: AccountUpdateFormValues,
): AccountUpdateRequest {
  return {
    version: account.version,
    activeStatus: values.activeStatus as 'Y' | 'N',
    currentBalance: Number(values.currentBalance),
    creditLimit: Number(values.creditLimit),
    cashCreditLimit: Number(values.cashCreditLimit),
    openDate: values.openDate,
    expirationDate: values.expirationDate,
    reissueDate: values.reissueDate,
    currentCycleCredit: Number(values.currentCycleCredit),
    currentCycleDebit: Number(values.currentCycleDebit),
    addressZip: account.addressZip,
    groupId: values.groupId ?? '',
  }
}

function toCustomerUpdateRequest(
  customer: Customer,
  values: AccountUpdateFormValues,
): CustomerUpdateRequest {
  return {
    version: customer.version,
    firstName: values.firstName,
    middleName: values.middleName ?? '',
    lastName: values.lastName,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2 ?? '',
    addressLine3: values.addressLine3,
    addressStateCode: values.addressStateCode,
    addressCountryCode: values.addressCountryCode,
    addressZip: values.addressZip,
    phoneNumber1: values.phoneNumber1 ?? '',
    phoneNumber2: values.phoneNumber2 ?? '',
    ssn: values.ssn,
    governmentIssuedId: values.governmentIssuedId ?? '',
    dateOfBirth: values.dateOfBirth,
    eftAccountId: values.eftAccountId ?? '',
    primaryCardholderIndicator: values.primaryCardholderIndicator as 'Y' | 'N',
    ficoCreditScore: Number(values.ficoCreditScore),
  }
}

export interface SaveProfileResult {
  ok: boolean
  /** Error text when `ok` is false. */
  message?: string
  /**
   * Latest server-confirmed profile. The save is atomic on the backend, so
   * on failure this is the unchanged current profile and both record
   * versions stay valid for a retry.
   */
  profile: AccountProfile
}

/**
 * Persist the edited SCREEN-05 field set through the atomic profile update.
 * The backend checks both optimistic versions and commits (or rolls back)
 * the account and customer records as one unit of work, matching the
 * legacy COACTUPC rewrite semantics.
 */
export async function saveAccountProfile(
  current: AccountProfile,
  values: AccountUpdateFormValues,
): Promise<SaveProfileResult> {
  try {
    const profile = await api.accounts.updateProfile(current.account.id, {
      account: toAccountUpdateRequest(current.account, values),
      customer: toCustomerUpdateRequest(current.customer, values),
    })
    return {
      ok: true,
      profile: { account: toAccount(profile.account), customer: toCustomer(profile.customer) },
    }
  } catch (error) {
    return { ok: false, message: failureMessage(error), profile: current }
  }
}
