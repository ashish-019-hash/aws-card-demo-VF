import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { AccountView } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar, type Message } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { isBlank, required, yesNoIfSupplied } from '../validation/rules'
import { formatAmount } from '../format'

const KNOWN_BILL_PAY_FIELDS: readonly string[] = ['accountId', 'confirm']

export function BillPaymentPage() {
  const [accountId, setAccountId] = useState('')
  const [confirm, setConfirm] = useState('')
  const [account, setAccount] = useState<AccountView | null>(null)
  const [errors, setErrors] = useState<{ accountId?: string; confirm?: string }>({})
  const [message, setMessage] = useState<Message | null>(null)

  function handleAccountIdChange(value: string) {
    setAccountId(value)
    setAccount(null)
  }

  // PF4 / 'N' confirm (COBIL00C CLEAR-CURRENT-SCREEN -> INITIALIZE-ALL-FIELDS): reset the
  // whole screen (account id, balance, confirm) and show no message.
  function handleClear() {
    setAccountId('')
    setAccount(null)
    setConfirm('')
    setErrors({})
    setMessage(null)
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    // VR-095
    const err = required(accountId, 'Acct ID can NOT be empty...')
    setErrors({ accountId: err })
    if (err) return
    try {
      const view = await endpoints.getAccount(accountId.trim())
      setAccount(view)
      setMessage(null)
    } catch (e2) {
      setAccount(null)
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to load account.' })
    }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault()
    // VR-096/VR-097 (COBIL00C PROCESS-ENTER-KEY):
    //   blank confirm  -> show "Confirm to make a bill payment..." and keep the form as-is.
    //   'N'/'n'        -> CLEAR-CURRENT-SCREEN: reset the whole screen (account id, balance,
    //                     confirm) and show no message, silently returning to a blank form.
    //   anything else that isn't Y/N -> "Invalid value. Valid values are (Y/N)..."
    if (isBlank(confirm)) {
      setMessage({ kind: 'info', text: 'Confirm to make a bill payment...' })
      return
    }
    if (/^n$/i.test(confirm.trim())) {
      handleClear()
      return
    }
    const invalid = yesNoIfSupplied(confirm, 'Invalid value. Valid values are (Y/N)...')
    if (invalid) {
      setErrors((prev) => ({ ...prev, confirm: invalid }))
      return
    }
    try {
      const response = await endpoints.payBill({ accountId: Number(accountId.trim()), confirm: confirm.trim() })
      setMessage({
        kind: response.paid ? 'success' : 'info',
        text: response.message ?? (response.paid ? 'Payment successful.' : ''),
      })
      if (response.paid) {
        setAccount(null)
        setAccountId('')
        setConfirm('')
      }
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const { fieldErrors, unmapped } = e2.fieldErrors(KNOWN_BILL_PAY_FIELDS)
        setErrors((prev) => ({ ...prev, ...fieldErrors }))
        setMessage({ kind: 'error', text: unmapped.length ? `${e2.message} ${unmapped.join(' ')}` : e2.message })
      } else {
        setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to process payment.' })
      }
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COBIL00C" title="Bill Payment" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <form onSubmit={handleLookup} className="form">
        <div className="form-row">
          <label htmlFor="accountId">Account ID</label>
          <input id="accountId" aria-invalid={Boolean(errors.accountId)} aria-describedby={errors.accountId ? 'accountId-error' : undefined} value={accountId} onChange={(e) => handleAccountIdChange(e.target.value)} maxLength={11} />
          <FieldError id="accountId-error" message={errors.accountId} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
          <button type="button" onClick={handleClear}>
            F4 = Clear
          </button>
        </div>
      </form>

      {account && (
        <>
          <dl className="detail-grid" data-testid="bill-payment-balance">
            <dt>Current Balance</dt>
            <dd>{formatAmount(account.fields.currBal)}</dd>
          </dl>
          <form onSubmit={(e) => void handlePay(e)} className="form" data-testid="bill-pay-form">
            <div className="form-row">
              <label htmlFor="confirm">Confirm full balance payment (Y/N)</label>
              <input id="confirm" aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'confirm-error' : undefined} value={confirm} maxLength={1} onChange={(e) => setConfirm(e.target.value)} />
              <FieldError id="confirm-error" message={errors.confirm} />
            </div>
            <div className="form-actions">
              <button type="submit">Enter</button>
            </div>
          </form>
        </>
      )}
      <BackLink to="/menu" />
    </div>
  )
}
