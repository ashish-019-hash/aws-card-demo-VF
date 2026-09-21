import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { AccountFields, AccountView } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import {
  alphaOptional,
  alphaRequired,
  dateOfBirthInPast,
  dateFormat,
  ficoRange,
  isBlank,
  nonZeroDigits,
  nonZeroNumeric,
  required,
  signedAmount,
  ssnAreaValid,
  stateCode,
  validCalendarDate,
  yesNo,
  type FieldErrors,
} from '../validation/rules'

type Step = 'search' | 'edit' | 'confirm'

function cloneFields(f: AccountFields): AccountFields {
  return { ...f }
}

function fieldsEqual(a: AccountFields, b: AccountFields): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function validateDate(field: string, value: string | null, dobCheck = false): string | undefined {
  const label = field
  let err = dateFormat(value, `${label} : Year must be supplied.`)
  if (err) return err
  err = validCalendarDate(value, `${label} validation error: not a valid date`)
  if (err) return err
  if (dobCheck) {
    err = dateOfBirthInPast(value, `${label}:cannot be in the future `)
    if (err) return err
  }
  return undefined
}

/** VR-043..VR-053: phone is optional as a whole, but if any part is present the parts
 *  (area/prefix/line) must each be a non-zero N-digit number. Accepts the persisted
 *  "(NNN)NNN-NNNN" format (with legacy trailing padding spaces). */
function validatePhone(value: string | null, label: string): string | undefined {
  if (isBlank(value)) return undefined
  const trimmed = (value ?? '').trim()
  const m = /^\((\d{0,3})\)(\d{0,3})-(\d{0,4})$/.exec(trimmed)
  if (!m) return `${label}: must be in format (NNN)NNN-NNNN.`
  const [, area, prefix, line] = m
  if (area.length !== 3) return `${label}: Area code must be A 3 digit number.`
  if (Number(area) === 0) return `${label}: Area code cannot be zero`
  if (prefix.length !== 3) return `${label}: Prefix code must be A 3 digit number.`
  if (Number(prefix) === 0) return `${label}: Prefix code cannot be zero`
  if (line.length !== 4) return `${label}: Line number code must be A 4 digit number.`
  if (Number(line) === 0) return `${label}: Line number code cannot be zero`
  return undefined
}

function validateAccountFields(f: AccountFields): FieldErrors {
  const errors: FieldErrors = {}
  errors.activeStatus = yesNo(f.activeStatus, 'Account Status must be supplied.')
  errors.creditLimit = signedAmount(f.creditLimit?.toString() ?? '', 'Credit Limit must be supplied.')
  errors.cashCreditLimit = signedAmount(f.cashCreditLimit?.toString() ?? '', 'Cash Credit Limit must be supplied.')
  errors.currBal = signedAmount(f.currBal?.toString() ?? '', 'Current Balance must be supplied.')
  errors.currCycCredit = signedAmount(f.currCycCredit?.toString() ?? '', 'Current Cycle Credit must be supplied.')
  errors.currCycDebit = signedAmount(f.currCycDebit?.toString() ?? '', 'Current Cycle Debit must be supplied.')
  errors.openDate = validateDate('Open Date', f.openDate)
  errors.expirationDate = validateDate('Expiration Date', f.expirationDate)
  errors.reissueDate = validateDate('Reissue Date', f.reissueDate)
  errors.dob = validateDate('Date of Birth', f.dob, true)
  errors.ficoCreditScore =
    required(f.ficoCreditScore?.toString(), 'FICO Score must be supplied.') ??
    ficoRange(f.ficoCreditScore, 'FICO Score: should be between 300 and 850')
  errors.firstName = alphaRequired(f.firstName, 'First Name must be supplied.')
  errors.middleName = alphaOptional(f.middleName, 'Middle Name can have alphabets only.')
  errors.lastName = alphaRequired(f.lastName, 'Last Name must be supplied.')
  errors.addrLine1 = required(f.addrLine1, 'Address Line 1 must be supplied.')
  errors.addrLine3 = alphaRequired(f.addrLine3, 'City must be supplied.')
  errors.addrCountryCd = alphaRequired(f.addrCountryCd, 'Country must be supplied.')
  errors.addrStateCd = alphaRequired(f.addrStateCd, 'State must be supplied.') ?? stateCode(f.addrStateCd, 'State: is not a valid state code')
  errors.addrZip = nonZeroDigits(f.addrZip ?? '', 5, 'Zip must be a 5 digit number.')
  if (!isBlank(f.ssn)) {
    const ssn = (f.ssn ?? '').replace(/\D/g, '')
    if (ssn.length !== 9) {
      errors.ssn = 'SSN must be 9 digits.'
    } else {
      errors.ssn = ssnAreaValid(ssn.slice(0, 3), 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999')
    }
  } else {
    errors.ssn = 'SSN must be supplied.'
  }
  errors.phoneNum1 = validatePhone(f.phoneNum1, 'Phone Number 1')
  errors.phoneNum2 = validatePhone(f.phoneNum2, 'Phone Number 2')
  errors.eftAccountId = nonZeroDigits(f.eftAccountId ?? '', 10, 'EFT Account Id must be a 10 digit number.')
  errors.priCardHolderInd = yesNo(f.priCardHolderInd, 'Primary Card Holder must be supplied.')
  return errors
}

export function AccountUpdatePage() {
  const [step, setStep] = useState<Step>('search')
  const [acctId, setAcctId] = useState('')
  const [searchError, setSearchError] = useState<string | undefined>()
  const [account, setAccount] = useState<AccountView | null>(null)
  const [expected, setExpected] = useState<AccountFields | null>(null)
  const [draft, setDraft] = useState<AccountFields | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    const err = required(acctId, 'Account number not provided') ?? nonZeroNumeric(acctId, 11, 'Account Number if supplied must be a 11 digit Non-Zero Number')
    setSearchError(err)
    if (err) return
    try {
      const view = await endpoints.getAccount(acctId.trim())
      setAccount(view)
      setExpected(cloneFields(view.fields))
      setDraft(cloneFields(view.fields))
      setStep('edit')
      setMessage(null)
      setErrors({})
    } catch (e2) {
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to look up account.' })
    }
  }

  function updateDraft<K extends keyof AccountFields>(key: K, value: AccountFields[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    if (!draft || !expected) return
    const fieldErrors = validateAccountFields(draft)
    setErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) {
      setMessage(null)
      return
    }
    if (fieldsEqual(draft, expected)) {
      setMessage({ kind: 'info', text: 'No change detected with respect to values fetched.' })
      return
    }
    setMessage({ kind: 'info', text: 'Changes validated.Press F5 to save' })
    setStep('confirm')
  }

  async function handleSave() {
    if (!draft || !expected || !account) return
    try {
      const response = await endpoints.updateAccount(account.acctId, { expected, updated: draft })
      if (response.changed) {
        setMessage({ kind: 'success', text: 'Changes committed to database' })
      } else {
        setMessage({ kind: 'info', text: 'No change detected with respect to values fetched.' })
      }
      setAccount(response.account)
      setExpected(cloneFields(response.account.fields))
      setDraft(cloneFields(response.account.fields))
      setErrors({})
      setStep('edit')
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 409) {
        setMessage({ kind: 'error', text: e2.message })
        // Refresh the snapshot so the next save attempt compares against current data.
        try {
          const fresh = await endpoints.getAccount(account.acctId)
          setAccount(fresh)
          setExpected(cloneFields(fresh.fields))
          setDraft(cloneFields(fresh.fields))
        } catch {
          /* keep showing the conflict message even if refresh fails */
        }
        setStep('edit')
      } else if (e2 instanceof ApiError && e2.status === 400) {
        const fieldErrors: FieldErrors = {}
        e2.errors.forEach((fe) => {
          fieldErrors[fe.field] = fe.message
        })
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: e2.message })
        setStep('edit')
      } else {
        setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to save account.' })
        setStep('edit')
      }
    }
  }

  function handleCancel() {
    if (!expected) return
    setDraft(cloneFields(expected))
    setErrors({})
    setMessage(null)
    setStep('edit')
  }

  if (step === 'search' || !draft) {
    return (
      <div className="screen">
        <ScreenHeader screenId="COACTUPC" title="Update Account" />
        <MessageBar kind="error" message={message?.text} />
        <form onSubmit={handleSearch} className="form">
          <div className="form-row">
            <label htmlFor="acctId">Account ID</label>
            <input id="acctId" value={acctId} onChange={(e) => setAcctId(e.target.value)} maxLength={11} autoFocus />
            <FieldError message={searchError} />
          </div>
          <div className="form-actions">
            <button type="submit">Enter</button>
          </div>
        </form>
        <BackLink to="/menu" />
      </div>
    )
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COACTUPC" title="Update Account" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <form onSubmit={handleValidate} className="form" data-testid="account-update-form">
        <div className="form-row">
          <label>Account ID</label>
          <span>{account?.acctId}</span>
        </div>
        <div className="form-row">
          <label htmlFor="activeStatus">Account Status (Y/N)</label>
          <input
            id="activeStatus"
            value={draft.activeStatus ?? ''}
            maxLength={1}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('activeStatus', e.target.value)}
          />
          <FieldError message={errors.activeStatus} />
        </div>
        <div className="form-row">
          <label htmlFor="creditLimit">Credit Limit</label>
          <input
            id="creditLimit"
            type="number"
            step="0.01"
            value={draft.creditLimit ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('creditLimit', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.creditLimit} />
        </div>
        <div className="form-row">
          <label htmlFor="cashCreditLimit">Cash Credit Limit</label>
          <input
            id="cashCreditLimit"
            type="number"
            step="0.01"
            value={draft.cashCreditLimit ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('cashCreditLimit', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.cashCreditLimit} />
        </div>
        <div className="form-row">
          <label htmlFor="currBal">Current Balance</label>
          <input
            id="currBal"
            type="number"
            step="0.01"
            value={draft.currBal ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('currBal', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.currBal} />
        </div>
        <div className="form-row">
          <label htmlFor="currCycCredit">Current Cycle Credit</label>
          <input
            id="currCycCredit"
            type="number"
            step="0.01"
            value={draft.currCycCredit ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('currCycCredit', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.currCycCredit} />
        </div>
        <div className="form-row">
          <label htmlFor="currCycDebit">Current Cycle Debit</label>
          <input
            id="currCycDebit"
            type="number"
            step="0.01"
            value={draft.currCycDebit ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('currCycDebit', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.currCycDebit} />
        </div>
        <div className="form-row">
          <label htmlFor="openDate">Open Date (YYYY-MM-DD)</label>
          <input
            id="openDate"
            value={draft.openDate ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('openDate', e.target.value)}
          />
          <FieldError message={errors.openDate} />
        </div>
        <div className="form-row">
          <label htmlFor="expirationDate">Expiration Date (YYYY-MM-DD)</label>
          <input
            id="expirationDate"
            value={draft.expirationDate ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('expirationDate', e.target.value)}
          />
          <FieldError message={errors.expirationDate} />
        </div>
        <div className="form-row">
          <label htmlFor="reissueDate">Reissue Date (YYYY-MM-DD)</label>
          <input
            id="reissueDate"
            value={draft.reissueDate ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('reissueDate', e.target.value)}
          />
          <FieldError message={errors.reissueDate} />
        </div>
        <div className="form-row">
          <label htmlFor="groupId">Group ID</label>
          <input
            id="groupId"
            value={draft.groupId ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('groupId', e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="ficoCreditScore">FICO Score</label>
          <input
            id="ficoCreditScore"
            type="number"
            value={draft.ficoCreditScore ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('ficoCreditScore', e.target.value === '' ? null : Number(e.target.value))}
          />
          <FieldError message={errors.ficoCreditScore} />
        </div>
        <div className="form-row">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            value={draft.firstName ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('firstName', e.target.value)}
          />
          <FieldError message={errors.firstName} />
        </div>
        <div className="form-row">
          <label htmlFor="middleName">Middle Name</label>
          <input
            id="middleName"
            value={draft.middleName ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('middleName', e.target.value)}
          />
          <FieldError message={errors.middleName} />
        </div>
        <div className="form-row">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            value={draft.lastName ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('lastName', e.target.value)}
          />
          <FieldError message={errors.lastName} />
        </div>
        <div className="form-row">
          <label htmlFor="addrLine1">Address Line 1</label>
          <input
            id="addrLine1"
            value={draft.addrLine1 ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrLine1', e.target.value)}
          />
          <FieldError message={errors.addrLine1} />
        </div>
        <div className="form-row">
          <label htmlFor="addrLine2">Address Line 2</label>
          <input
            id="addrLine2"
            value={draft.addrLine2 ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrLine2', e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="addrLine3">City (Address Line 3)</label>
          <input
            id="addrLine3"
            value={draft.addrLine3 ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrLine3', e.target.value)}
          />
          <FieldError message={errors.addrLine3} />
        </div>
        <div className="form-row">
          <label htmlFor="addrStateCd">State</label>
          <input
            id="addrStateCd"
            value={draft.addrStateCd ?? ''}
            maxLength={2}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrStateCd', e.target.value.toUpperCase())}
          />
          <FieldError message={errors.addrStateCd} />
        </div>
        <div className="form-row">
          <label htmlFor="addrZip">Zip</label>
          <input
            id="addrZip"
            value={draft.addrZip ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrZip', e.target.value)}
          />
          <FieldError message={errors.addrZip} />
        </div>
        <div className="form-row">
          <label htmlFor="addrCountryCd">Country</label>
          <input
            id="addrCountryCd"
            value={draft.addrCountryCd ?? ''}
            maxLength={3}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('addrCountryCd', e.target.value.toUpperCase())}
          />
          <FieldError message={errors.addrCountryCd} />
        </div>
        <div className="form-row">
          <label htmlFor="phoneNum1">Phone Number 1</label>
          <input
            id="phoneNum1"
            value={draft.phoneNum1 ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('phoneNum1', e.target.value)}
          />
          <FieldError message={errors.phoneNum1} />
        </div>
        <div className="form-row">
          <label htmlFor="phoneNum2">Phone Number 2</label>
          <input
            id="phoneNum2"
            value={draft.phoneNum2 ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('phoneNum2', e.target.value)}
          />
          <FieldError message={errors.phoneNum2} />
        </div>
        <div className="form-row">
          <label htmlFor="ssn">SSN</label>
          <input
            id="ssn"
            value={draft.ssn ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('ssn', e.target.value)}
          />
          <FieldError message={errors.ssn} />
        </div>
        <div className="form-row">
          <label htmlFor="govtIssuedId">Government Issued ID</label>
          <input
            id="govtIssuedId"
            value={draft.govtIssuedId ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('govtIssuedId', e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="dob">Date of Birth (YYYY-MM-DD)</label>
          <input
            id="dob"
            value={draft.dob ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('dob', e.target.value)}
          />
          <FieldError message={errors.dob} />
        </div>
        <div className="form-row">
          <label htmlFor="eftAccountId">EFT Account ID</label>
          <input
            id="eftAccountId"
            value={draft.eftAccountId ?? ''}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('eftAccountId', e.target.value)}
          />
          <FieldError message={errors.eftAccountId} />
        </div>
        <div className="form-row">
          <label htmlFor="priCardHolderInd">Primary Card Holder (Y/N)</label>
          <input
            id="priCardHolderInd"
            value={draft.priCardHolderInd ?? ''}
            maxLength={1}
            disabled={step === 'confirm'}
            onChange={(e) => updateDraft('priCardHolderInd', e.target.value)}
          />
          <FieldError message={errors.priCardHolderInd} />
        </div>

        {step === 'edit' && (
          <div className="form-actions">
            <button type="submit">Enter (validate)</button>
          </div>
        )}
      </form>

      {step === 'confirm' && (
        <div className="form-actions" data-testid="confirm-actions">
          <button type="button" onClick={() => void handleSave()}>
            F5 = Save
          </button>
          <button type="button" onClick={handleCancel}>
            F12 = Cancel
          </button>
        </div>
      )}
      <BackLink to="/menu" />
    </div>
  )
}
