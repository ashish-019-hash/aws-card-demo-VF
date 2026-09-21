import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { TransactionSummary } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { isBlank, isNumeric } from '../validation/rules'
import { formatAmount, formatDateOnly } from '../format'

export function TransactionListPage() {
  const [startId, setStartId] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<TransactionSummary[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()

  const load = useCallback(async (targetPage: number, jumpId?: string) => {
    try {
      const response = await endpoints.listTransactions({ startId: jumpId, page: targetPage })
      setItems(response.items)
      setHasNext(response.hasNext)
      setHasPrevious(response.hasPrevious)
      setPage(targetPage)
      setMessage(response.items.length === 0 ? 'No transactions found.' : null)
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Unable to load transactions.')
    }
  }, [])

  useEffect(() => {
    void load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    // VR-070
    if (!isBlank(startId) && !isNumeric(startId.trim())) {
      setFieldError('Tran ID must be Numeric ...')
      return
    }
    setFieldError(undefined)
    void load(0, startId.trim() || undefined)
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COTRN00C" title="List Transactions" />
      <MessageBar kind="error" message={message} />
      <form onSubmit={handleSearch} className="form">
        <div className="form-row">
          <label htmlFor="startId">Jump to Transaction ID</label>
          <input id="startId" aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'startId-error' : undefined} value={startId} onChange={(e) => setStartId(e.target.value)} />
          <FieldError id="startId-error" message={fieldError} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      <table className="data-table" data-testid="transaction-list">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.tranId}>
              <td>{t.tranId}</td>
              <td>{formatDateOnly(t.origTs)}</td>
              <td>{t.description}</td>
              <td>{formatAmount(t.amount)}</td>
              <td>
                <Link to={`/transactions/view?tranId=${t.tranId}`} state={{ from: '/transactions' }}>S = View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="form-actions">
        <button type="button" disabled={!hasPrevious} onClick={() => void load(page - 1)}>
          F7 = Prev Page
        </button>
        <button type="button" disabled={!hasNext} onClick={() => void load(page + 1)}>
          F8 = Next Page
        </button>
      </div>
      <BackLink to="/menu" />
    </div>
  )
}
