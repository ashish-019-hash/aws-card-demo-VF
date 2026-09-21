import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { TransactionAddRequest } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import {
  isBlank,
  isNumeric,
  required,
  dateFormat,
  validCalendarDate,
  yesNoIfSupplied,
  type FieldErrors,
} from '../validation/rules'

interface FormState {
  accountId: string
  cardNum: string
  typeCd: string
  catCd: string
  source: string
  description: string
  amount: string
  origDate: string
  procDate: string
  merchantId: string
  merchantName: string
  merchantCity: string
  merchantZip: string
  confirm: string
}

const initialForm: FormState = {
  accountId: '',
  cardNum: '',
  typeCd: '',
  catCd: '',
  source: '',
  description: '',
  amount: '',
  origDate: '',
  procDate: '',
  merchantId: '',
  merchantName: '',
  merchantCity: '',
  merchantZip: '',
  confirm: '',
}

function validate(f: FormState): FieldErrors {
  const errors: FieldErrors = {}
  // VR-072/073/074: at least one of account/card, each numeric if supplied.
  if (!isBlank(f.accountId) && !isNumeric(f.accountId.trim())) {
    errors.accountId = 'Account ID must be Numeric...'
  }
  if (!isBlank(f.cardNum) && !isNumeric(f.cardNum.trim())) {
    errors.cardNum = 'Card Number must be Numeric...'
  }
  if (isBlank(f.accountId) && isBlank(f.cardNum)) {
    errors.both = 'Account or Card Number must be entered...'
  }
  errors.typeCd =
    required(f.typeCd, 'Type CD can NOT be empty...') ??
    (isNumeric(f.typeCd.trim()) ? undefined : 'Type CD must be Numeric...')
  errors.catCd =
    required(f.catCd, 'Category CD can NOT be empty...') ??
    (isNumeric(f.catCd.trim()) ? undefined : 'Category CD must be Numeric...')
  errors.source = required(f.source, 'Source can NOT be empty...')
  errors.description = required(f.description, 'Description can NOT be empty...')
  errors.amount =
    required(f.amount, 'Amount can NOT be empty...') ??
    (/^-?\d{1,8}(\.\d{1,2})?$/.test(f.amount.trim()) ? undefined : 'Amount should be in format -99999999.99')
  errors.origDate =
    required(f.origDate, 'Orig Date can NOT be empty...') ??
    dateFormat(f.origDate, 'Orig Date should be in format YYYY-MM-DD') ??
    validCalendarDate(f.origDate, 'Orig Date - Not a valid date...')
  errors.procDate =
    required(f.procDate, 'Proc Date can NOT be empty...') ??
    dateFormat(f.procDate, 'Proc Date should be in format YYYY-MM-DD') ??
    validCalendarDate(f.procDate, 'Proc Date - Not a valid date...')
  errors.merchantId =
    required(f.merchantId, 'Merchant ID can NOT be empty...') ??
    (isNumeric(f.merchantId.trim()) ? undefined : 'Merchant ID must be Numeric...')
  errors.merchantName = required(f.merchantName, 'Merchant Name can NOT be empty...')
  errors.merchantCity = required(f.merchantCity, 'Merchant City can NOT be empty...')
  errors.merchantZip = required(f.merchantZip, 'Merchant Zip can NOT be empty...')
  return errors
}

export function TransactionAddPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [validated, setValidated] = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setValidated(false)
  }

  function updateConfirm(value: string) {
    // Confirm is entered *after* validation succeeds; typing it must not clear the
    // "validated" state that unlocks the confirm-gated submit (VR-094).
    setForm((prev) => ({ ...prev, confirm: value }))
  }

  async function handleCopyLast() {
    if (isBlank(form.cardNum)) {
      setMessage({ kind: 'error', text: 'Card Number must be supplied to copy the last transaction...' })
      return
    }
    try {
      const last = await endpoints.getLastTransaction(form.cardNum.trim())
      setForm((prev) => ({
        ...prev,
        typeCd: last.typeCd ?? '',
        catCd: last.catCd != null ? String(last.catCd) : '',
        source: last.source ?? '',
        description: last.description ?? '',
        amount: last.amount != null ? String(last.amount) : '',
        origDate: last.origTs ?? '',
        procDate: last.procTs ?? '',
        merchantId: last.merchantId != null ? String(last.merchantId) : '',
        merchantName: last.merchantName ?? '',
        merchantCity: last.merchantCity ?? '',
        merchantZip: last.merchantZip ?? '',
      }))
      setMessage({ kind: 'info', text: 'Last transaction details copied.' })
      setValidated(false)
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Unable to copy last transaction.' })
    }
  }

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(form)
    setErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) {
      setMessage(null)
      setValidated(false)
      return
    }
    setMessage({ kind: 'info', text: 'Transaction validated. Set Confirm to Y and press Enter to add.' })
    setValidated(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validated) {
      handleValidate(e)
      return
    }
    // VR-094
    const confirmError = isBlank(form.confirm)
      ? 'Confirm to add this transaction...'
      : yesNoIfSupplied(form.confirm, 'Invalid value. Valid values are (Y/N)...')
    if (confirmError) {
      setErrors((prev) => ({ ...prev, confirm: confirmError }))
      return
    }
    if (/^n$/i.test(form.confirm.trim())) {
      setMessage({ kind: 'info', text: 'Confirm to add this transaction...' })
      return
    }
    const payload: TransactionAddRequest = {
      accountId: isBlank(form.accountId) ? null : Number(form.accountId),
      cardNum: isBlank(form.cardNum) ? null : form.cardNum.trim(),
      typeCd: form.typeCd.trim(),
      catCd: Number(form.catCd),
      source: form.source.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      origDate: form.origDate.trim(),
      procDate: form.procDate.trim(),
      merchantId: Number(form.merchantId),
      merchantName: form.merchantName.trim(),
      merchantCity: form.merchantCity.trim(),
      merchantZip: form.merchantZip.trim(),
      confirm: form.confirm.trim(),
    }
    try {
      const response = await endpoints.addTransaction(payload)
      setMessage({ kind: 'success', text: `Transaction added, ID ${response.tranId}.` })
      setForm(initialForm)
      setErrors({})
      setValidated(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const fieldErrors: FieldErrors = {}
        e.errors.forEach((fe) => {
          fieldErrors[fe.field] = fe.message
        })
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: e.message })
      } else {
        setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Unable to add transaction.' })
      }
      setValidated(false)
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COTRN02C" title="Add Transaction" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <MessageBar kind="error" message={errors.both} />
      <form onSubmit={handleSubmit} className="form" data-testid="transaction-add-form">
        <div className="form-row">
          <label htmlFor="accountId">Account ID</label>
          <input id="accountId" value={form.accountId} onChange={(e) => update('accountId', e.target.value)} />
          <FieldError message={errors.accountId} />
        </div>
        <div className="form-row">
          <label htmlFor="cardNum">Card Number</label>
          <input id="cardNum" value={form.cardNum} onChange={(e) => update('cardNum', e.target.value)} />
          <FieldError message={errors.cardNum} />
          <button type="button" onClick={() => void handleCopyLast()}>
            F5 = Copy Last Transaction
          </button>
        </div>
        <div className="form-row">
          <label htmlFor="typeCd">Type Code</label>
          <input id="typeCd" value={form.typeCd} onChange={(e) => update('typeCd', e.target.value)} />
          <FieldError message={errors.typeCd} />
        </div>
        <div className="form-row">
          <label htmlFor="catCd">Category Code</label>
          <input id="catCd" value={form.catCd} onChange={(e) => update('catCd', e.target.value)} />
          <FieldError message={errors.catCd} />
        </div>
        <div className="form-row">
          <label htmlFor="source">Source</label>
          <input id="source" value={form.source} onChange={(e) => update('source', e.target.value)} />
          <FieldError message={errors.source} />
        </div>
        <div className="form-row">
          <label htmlFor="description">Description</label>
          <input id="description" value={form.description} onChange={(e) => update('description', e.target.value)} />
          <FieldError message={errors.description} />
        </div>
        <div className="form-row">
          <label htmlFor="amount">Amount</label>
          <input id="amount" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          <FieldError message={errors.amount} />
        </div>
        <div className="form-row">
          <label htmlFor="origDate">Orig Date (YYYY-MM-DD)</label>
          <input id="origDate" value={form.origDate} onChange={(e) => update('origDate', e.target.value)} />
          <FieldError message={errors.origDate} />
        </div>
        <div className="form-row">
          <label htmlFor="procDate">Proc Date (YYYY-MM-DD)</label>
          <input id="procDate" value={form.procDate} onChange={(e) => update('procDate', e.target.value)} />
          <FieldError message={errors.procDate} />
        </div>
        <div className="form-row">
          <label htmlFor="merchantId">Merchant ID</label>
          <input id="merchantId" value={form.merchantId} onChange={(e) => update('merchantId', e.target.value)} />
          <FieldError message={errors.merchantId} />
        </div>
        <div className="form-row">
          <label htmlFor="merchantName">Merchant Name</label>
          <input id="merchantName" value={form.merchantName} onChange={(e) => update('merchantName', e.target.value)} />
          <FieldError message={errors.merchantName} />
        </div>
        <div className="form-row">
          <label htmlFor="merchantCity">Merchant City</label>
          <input id="merchantCity" value={form.merchantCity} onChange={(e) => update('merchantCity', e.target.value)} />
          <FieldError message={errors.merchantCity} />
        </div>
        <div className="form-row">
          <label htmlFor="merchantZip">Merchant Zip</label>
          <input id="merchantZip" value={form.merchantZip} onChange={(e) => update('merchantZip', e.target.value)} />
          <FieldError message={errors.merchantZip} />
        </div>
        <div className="form-row">
          <label htmlFor="confirm">Confirm (Y/N)</label>
          <input id="confirm" value={form.confirm} maxLength={1} onChange={(e) => updateConfirm(e.target.value)} />
          <FieldError message={errors.confirm} />
        </div>
        <div className="form-actions">
          <button type="submit">{validated ? 'Enter (confirm)' : 'Enter (validate)'}</button>
        </div>
      </form>
      <BackLink to="/menu" />
    </div>
  )
}
