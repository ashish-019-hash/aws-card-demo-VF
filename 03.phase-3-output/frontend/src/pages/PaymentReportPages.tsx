import { useState } from 'react'
import { accountApi, reportApi } from '../api/services'
import type { Report, ReportType } from '../api/types'
import { ErrorMessage, Notice, PageHeader, SearchForm, SubmitButton, formatMoney } from '../components/ui'
const dateValue = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf()) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
export function PaymentPage() {
  const [id, setId] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [result, setResult] = useState<{ status: string; paidAmount: number; newBalance: number }>()
  const [error, setError] = useState<unknown>()
  const [pending, setPending] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{1,11}$/.test(id)) {
      setError(new Error('Account ID is required.'))
      return
    }
    if (confirmation.toUpperCase() !== 'Y') {
      setError(new Error('Enter Y to confirm the bill payment.'))
      return
    }
    setPending(true)
    try {
      setResult(await accountApi.pay(id, confirmation.toUpperCase()))
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageHeader
        title="Bill payment"
        description="Settle an account's full positive outstanding balance after confirmation."
      />
      <SearchForm onSubmit={submit}>
        <label>
          Account ID
          <input value={id} onChange={(event) => setId(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Confirm (Y)
          <input
            value={confirmation}
            maxLength={1}
            onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
          />
        </label>
        <SubmitButton pending={pending}>Submit payment</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {result && (
        <Notice tone="success">
          {result.status}: {formatMoney(result.paidAmount)} paid. New balance: {formatMoney(result.newBalance)}.
        </Notice>
      )}
    </>
  )
}
export function ReportPage() {
  const [type, setType] = useState<ReportType>('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [result, setResult] = useState<Report>()
  const [error, setError] = useState<unknown>()
  const [pending, setPending] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (type === 'CUSTOM' && (!dateValue(startDate) || !dateValue(endDate) || startDate > endDate)) {
      setError(new Error('Custom reports require valid start and end dates in chronological order.'))
      return
    }
    if (confirmation.toUpperCase() !== 'Y') {
      setError(new Error('Enter Y to submit the report request.'))
      return
    }
    setPending(true)
    try {
      setResult(await reportApi.request(type, startDate, endDate, confirmation.toUpperCase()))
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageHeader
        title="Transaction reports"
        description="Request monthly, yearly, or custom reports. Y explicitly submits the request."
      />
      <form className="data-form compact" onSubmit={submit} noValidate>
        <label>
          Report type
          <select value={type} onChange={(event) => setType(event.target.value as ReportType)}>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="CUSTOM">Custom period</option>
          </select>
        </label>
        {type === 'CUSTOM' && (
          <>
            <label>
              Start date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </>
        )}
        <label>
          Confirm (Y)
          <input
            maxLength={1}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
          />
        </label>
        <SubmitButton pending={pending}>Submit report request</SubmitButton>
      </form>
      <ErrorMessage error={error} />
      {result && (
        <section className="details">
          <h2>
            Report {result.requestId}: {result.status}
          </h2>
          <p>
            {result.type} · {result.startDate} to {result.endDate}
          </p>
          {result.transactions.length ? (
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Card</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((item) => (
                  <tr key={item.transactionId}>
                    <td>{item.transactionId}</td>
                    <td>{item.cardNumber}</td>
                    <td>{item.description}</td>
                    <td>{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No transactions are included in this period.</p>
          )}
        </section>
      )}
    </>
  )
}
