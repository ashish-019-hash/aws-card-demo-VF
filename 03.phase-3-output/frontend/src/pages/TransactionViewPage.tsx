import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { TransactionDetail } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { required } from '../validation/rules'
import { formatAmount, formatDateOnly } from '../format'

export function TransactionViewPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'
  const [tranId, setTranId] = useState(searchParams.get('tranId') ?? '')
  const [tran, setTran] = useState<TransactionDetail | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()

  async function lookup(id: string) {
    try {
      const detail = await endpoints.getTransaction(id)
      setTran(detail)
      setMessage(null)
    } catch (e) {
      setTran(null)
      setMessage(e instanceof ApiError ? e.message : 'Unable to look up transaction.')
    }
  }

  useEffect(() => {
    const initial = searchParams.get('tranId')
    if (initial) void lookup(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // VR-071
    const err = required(tranId, 'Tran ID can NOT be empty...')
    setFieldError(err)
    if (err) return
    void lookup(tranId.trim())
  }

  // PF4 (COTRN01C CLEAR-CURRENT-SCREEN): reset the whole screen.
  function handleClear() {
    setTranId('')
    setTran(null)
    setMessage(null)
    setFieldError(undefined)
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COTRN01C" title="View Transaction" />
      <MessageBar kind="error" message={message} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="tranId">Transaction ID</label>
          <input id="tranId" aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'tranId-error' : undefined} value={tranId} onChange={(e) => setTranId(e.target.value)} />
          <FieldError id="tranId-error" message={fieldError} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
          <button type="button" onClick={handleClear}>
            F4 = Clear
          </button>
          <button type="button" onClick={() => navigate('/transactions')}>
            F5 = Back to Transaction List
          </button>
        </div>
      </form>

      {tran && (
        <dl className="detail-grid" data-testid="transaction-detail">
          <dt>Transaction ID</dt>
          <dd>{tran.tranId}</dd>
          <dt>Card Number</dt>
          <dd>{tran.cardNum}</dd>
          <dt>Type</dt>
          <dd>{tran.typeCd}</dd>
          <dt>Category</dt>
          <dd>{tran.catCd}</dd>
          <dt>Source</dt>
          <dd>{tran.source}</dd>
          <dt>Description</dt>
          <dd>{tran.description}</dd>
          <dt>Amount</dt>
          <dd>{formatAmount(tran.amount)}</dd>
          <dt>Original Date</dt>
          <dd>{formatDateOnly(tran.origTs)}</dd>
          <dt>Processing Date</dt>
          <dd>{formatDateOnly(tran.procTs)}</dd>
          <dt>Merchant ID</dt>
          <dd>{tran.merchantId}</dd>
          <dt>Merchant Name</dt>
          <dd>{tran.merchantName}</dd>
          <dt>Merchant City</dt>
          <dd>{tran.merchantCity}</dd>
          <dt>Merchant Zip</dt>
          <dd>{tran.merchantZip}</dd>
        </dl>
      )}
      <BackLink to={backTo} />
    </div>
  )
}
