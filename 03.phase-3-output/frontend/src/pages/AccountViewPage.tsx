import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { AccountView } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { nonZeroDigits, required } from '../validation/rules'
import { formatAccountId, formatAmount, formatCustomerId } from '../format'

export function AccountViewPage() {
  const [acctId, setAcctId] = useState('')
  const [account, setAccount] = useState<AccountView | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setAccount(null)
    // VR-005/VR-006
    const err = required(acctId, 'Account Filter must  be a non-zero 11 digit number')
      ?? nonZeroDigits(acctId, 11, 'Account Filter must  be a non-zero 11 digit number')
    setFieldError(err)
    if (err) return

    try {
      const view = await endpoints.getAccount(acctId.trim())
      setAccount(view)
    } catch (e2) {
      setMessage(e2 instanceof ApiError ? e2.message : 'Unable to look up account.')
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COACTVWC" title="View Account" />
      <MessageBar kind="error" message={message} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="acctId">Account ID</label>
          <input id="acctId" aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'acctId-error' : undefined} value={acctId} onChange={(e) => setAcctId(e.target.value)} maxLength={11} autoFocus />
          <FieldError id="acctId-error" message={fieldError} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {account && (
        <dl className="detail-grid" data-testid="account-detail">
          <dt>Account ID</dt>
          <dd>{formatAccountId(account.acctId)}</dd>
          <dt>Customer ID</dt>
          <dd>{formatCustomerId(account.custId)}</dd>
          <dt>Card Number</dt>
          <dd>{account.cardNum}</dd>
          <dt>Status</dt>
          <dd>{account.fields.activeStatus}</dd>
          <dt>Open Date</dt>
          <dd>{account.fields.openDate}</dd>
          <dt>Expiration Date</dt>
          <dd>{account.fields.expirationDate}</dd>
          <dt>Reissue Date</dt>
          <dd>{account.fields.reissueDate}</dd>
          <dt>Credit Limit</dt>
          <dd>{formatAmount(account.fields.creditLimit)}</dd>
          <dt>Cash Credit Limit</dt>
          <dd>{formatAmount(account.fields.cashCreditLimit)}</dd>
          <dt>Current Balance</dt>
          <dd>{formatAmount(account.fields.currBal)}</dd>
          <dt>Current Cycle Credit</dt>
          <dd>{formatAmount(account.fields.currCycCredit)}</dd>
          <dt>Current Cycle Debit</dt>
          <dd>{formatAmount(account.fields.currCycDebit)}</dd>
          <dt>Group ID</dt>
          <dd>{account.fields.groupId}</dd>
          <dt>Name</dt>
          <dd>
            {account.fields.firstName} {account.fields.middleName} {account.fields.lastName}
          </dd>
          <dt>Address</dt>
          <dd>
            {account.fields.addrLine1}, {account.fields.addrLine2}, {account.fields.addrLine3},{' '}
            {account.fields.addrStateCd} {account.fields.addrZip} {account.fields.addrCountryCd}
          </dd>
          <dt>Phone 1 / Phone 2</dt>
          <dd>
            {account.fields.phoneNum1} / {account.fields.phoneNum2}
          </dd>
          <dt>SSN</dt>
          <dd>{account.fields.ssn}</dd>
          <dt>Date of Birth</dt>
          <dd>{account.fields.dob}</dd>
          <dt>FICO Score</dt>
          <dd>{account.fields.ficoCreditScore}</dd>
          <dt>Government Issued ID</dt>
          <dd>{account.fields.govtIssuedId}</dd>
          <dt>EFT Account ID</dt>
          <dd>{account.fields.eftAccountId}</dd>
          <dt>Primary Card Holder</dt>
          <dd>{account.fields.priCardHolderInd}</dd>
        </dl>
      )}
      <BackLink to="/menu" />
    </div>
  )
}
