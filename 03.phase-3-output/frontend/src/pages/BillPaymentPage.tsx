import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { AccountView } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { isBlank, required, yesNoIfSupplied } from '../validation/rules'

export function BillPaymentPage() {
  const [accountId, setAccountId] = useState('')
  const [confirm, setConfirm] = useState('')
  const [account, setAccount] = useState<AccountView | null>(null)
  const [errors, setErrors] = useState<{ accountId?: string; confirm?: string }>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)

  function handleAccountIdChange(value: string) {
    setAccountId(value)
    setAccount(null)
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
    // VR-096/VR-097
    if (!isBlank(confirm)) {
      const invalid = yesNoIfSupplied(confirm, 'Invalid value. Valid values are (Y/N)...')
      if (invalid) {
        setErrors((prev) => ({ ...prev, confirm: invalid }))
        return
      }
    }
    if (isBlank(confirm) || /^n$/i.test(confirm.trim())) {
      setMessage({ kind: 'info', text: 'Confirm to make a bill payment...' })
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
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to process payment.' })
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COBIL00C" title="Bill Payment" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <form onSubmit={handleLookup} className="form">
        <div className="form-row">
          <label htmlFor="accountId">Account ID</label>
          <input id="accountId" value={accountId} onChange={(e) => handleAccountIdChange(e.target.value)} maxLength={11} />
          <FieldError message={errors.accountId} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {account && (
        <>
          <dl className="detail-grid" data-testid="bill-payment-balance">
            <dt>Current Balance</dt>
            <dd>{account.fields.currBal}</dd>
          </dl>
          <form onSubmit={(e) => void handlePay(e)} className="form" data-testid="bill-pay-form">
            <div className="form-row">
              <label htmlFor="confirm">Confirm full balance payment (Y/N)</label>
              <input id="confirm" value={confirm} maxLength={1} onChange={(e) => setConfirm(e.target.value)} />
              <FieldError message={errors.confirm} />
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
