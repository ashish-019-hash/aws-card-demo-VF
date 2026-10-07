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
import { profileToFormValues } from './formValues'
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

/** SCREEN-05 fields that live on the account record. */
const ACCOUNT_FORM_FIELDS = [
  'activeStatus',
  'openDate',
  'expirationDate',
  'reissueDate',
  'creditLimit',
  'cashCreditLimit',
  'currentBalance',
  'currentCycleCredit',
  'currentCycleDebit',
  'groupId',
] as const satisfies ReadonlyArray<keyof AccountUpdateFormValues>

/** SCREEN-05 fields that live on the customer record. */
const CUSTOMER_FORM_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'ssn',
  'dateOfBirth',
  'ficoCreditScore',
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'addressStateCode',
  'addressZip',
  'addressCountryCode',
  'phoneNumber1',
  'phoneNumber2',
  'governmentIssuedId',
  'eftAccountId',
  'primaryCardholderIndicator',
] as const satisfies ReadonlyArray<keyof AccountUpdateFormValues>

function fieldsDiffer(
  a: AccountUpdateFormValues,
  b: AccountUpdateFormValues,
  keys: ReadonlyArray<keyof AccountUpdateFormValues>,
): boolean {
  return keys.some((key) => (a[key] ?? '') !== (b[key] ?? ''))
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
   * Latest server-confirmed profile. On a partial failure (account saved,
   * customer rejected) this carries the committed account so record
   * versions stay in sync for a retry.
   */
  profile: AccountProfile
}

/**
 * Persist the edited SCREEN-05 field set. Account and customer live in
 * separate records with separate optimistic versions, so each side is
 * updated only when one of its fields differs from the current profile.
 */
export async function saveAccountProfile(
  current: AccountProfile,
  values: AccountUpdateFormValues,
): Promise<SaveProfileResult> {
  const currentValues = profileToFormValues(current)
  let account = current.account
  let customer = current.customer
  try {
    if (fieldsDiffer(values, currentValues, ACCOUNT_FORM_FIELDS)) {
      account = toAccount(
        await api.accounts.update(account.id, toAccountUpdateRequest(account, values)),
      )
    }
    if (fieldsDiffer(values, currentValues, CUSTOMER_FORM_FIELDS)) {
      customer = toCustomer(
        await api.customers.update(customer.id, toCustomerUpdateRequest(customer, values)),
      )
    }
    return { ok: true, profile: { account, customer } }
  } catch (error) {
    return { ok: false, message: failureMessage(error), profile: { account, customer } }
  }
}
