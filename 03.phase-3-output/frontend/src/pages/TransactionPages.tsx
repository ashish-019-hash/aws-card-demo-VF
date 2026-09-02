import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { transactionApi } from '../api/services'
import type { Page, Transaction } from '../api/types'
import {
  BackLink,
  Empty,
  ErrorMessage,
  Loading,
  Notice,
  PageHeader,
  Pagination,
  SearchForm,
  SubmitButton,
  formatMoney,
} from '../components/ui'
const calendarDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf()) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
export function TransactionListPage() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState<Page<Transaction>>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const load = async (next = 0) => {
    if (filter && !/^\d{1,16}$/.test(filter)) {
      setError(new Error('Transaction ID must be numeric.'))
      return
    }
    setLoading(true)
    try {
      setPage(await transactionApi.list({ fromTransactionId: filter, page: next, size: 10 }))
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  return (
    <>
      <PageHeader title="Transactions" description="Browse transactions from an optional numeric transaction ID." />
      <SearchForm
        onSubmit={(event) => {
          event.preventDefault()
          void load()
        }}
      >
        <label>
          Starting transaction ID
          <input value={filter} onChange={(event) => setFilter(event.target.value)} inputMode="numeric" />
        </label>
        <SubmitButton pending={loading}>Search</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {loading && <Loading />}
      {page &&
        (page.content.length ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Processing date</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((item) => (
                  <tr key={item.transactionId}>
                    <td>
                      <Link to={`/transactions/${item.transactionId}`}>{item.transactionId}</Link>
                    </td>
                    <td>{item.processingTimestamp}</td>
                    <td>{item.description}</td>
                    <td>{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} onChange={(next) => void load(next)} />
          </>
        ) : (
          <Empty>No transactions found.</Empty>
        ))}
    </>
  )
}
export function TransactionDetailPage() {
  const { transactionId = '' } = useParams()
  const [item, setItem] = useState<Transaction>()
  const [error, setError] = useState<unknown>()
  useEffect(() => {
    transactionApi.get(transactionId).then(setItem).catch(setError)
  }, [transactionId])
  return (
    <>
      <BackLink to="/transactions">Transactions</BackLink>
      <PageHeader title="Transaction details" description="Review financial, source, date, and merchant information." />
      <ErrorMessage error={error} />
      {!item && !error && <Loading />}
      {item && (
        <section className="details">
          <h2>{item.transactionId}</h2>
          <dl>
            {Object.entries({
              Card: item.cardNumber,
              'Type / category': `${item.transactionTypeCode} / ${item.transactionCategoryCode}`,
              Source: item.source,
              Description: item.description,
              Amount: formatMoney(item.amount),
              'Origin date': item.originalTimestamp,
              'Processing date': item.processingTimestamp,
              'Merchant ID': item.merchantId,
              'Merchant name': item.merchantName,
              'Merchant city': item.merchantCity,
              'Merchant ZIP': item.merchantZip,
            }).map(([key, value]) => (
              <Fragment key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}
export function TransactionLookupPage() {
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) {
      setError('Transaction ID can NOT be empty.')
      return
    }
    navigate(`/transactions/${id}`)
  }
  return (
    <>
      <PageHeader title="Transaction lookup" description="Find a transaction by its identifier." />
      <SearchForm onSubmit={submit}>
        <label>
          Transaction ID
          <input value={id} onChange={(event) => setId(event.target.value)} />
        </label>
        <button>Find transaction</button>
      </SearchForm>
      {error && <Notice tone="error">{error}</Notice>}
    </>
  )
}
export function TransactionAddPage() {
  const [values, setValues] = useState<Record<string, string>>({
    accountId: '',
    cardNumber: '',
    transactionTypeCode: '',
    transactionCategoryCode: '',
    source: '',
    description: '',
    amount: '',
    originDate: '',
    processingDate: '',
    merchantId: '',
    merchantName: '',
    merchantCity: '',
    merchantZip: '',
    confirmation: '',
  })
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const set = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const required = [
      'transactionTypeCode',
      'transactionCategoryCode',
      'source',
      'description',
      'amount',
      'originDate',
      'processingDate',
      'merchantId',
      'merchantName',
      'merchantCity',
      'merchantZip',
    ]
    if ((!values.accountId && !values.cardNumber) || required.some((key) => !values[key])) {
      setError(new Error('Provide an account ID or card number and complete all transaction and merchant fields.'))
      return
    }
    if (
      (values.accountId && !/^\d{1,11}$/.test(values.accountId)) ||
      (values.cardNumber && !/^\d{16}$/.test(values.cardNumber)) ||
      !/^\d+$/.test(values.transactionTypeCode) ||
      !/^\d+$/.test(values.transactionCategoryCode) ||
      !/^\d+$/.test(values.merchantId) ||
      !/^[+-]\d{1,8}\.\d{2}$/.test(values.amount)
    ) {
      setError(
        new Error(
          'Identifiers, codes, and merchant ID must be numeric; amount must use a sign, 1–8 digits, and exactly two decimals.',
        ),
      )
      return
    }
    if (!calendarDate(values.originDate) || !calendarDate(values.processingDate)) {
      setError(new Error('Origin and processing dates must be valid calendar dates.'))
      return
    }
    if (values.confirmation.toUpperCase() !== 'Y') {
      setError(new Error('Enter Y to confirm the transaction.'))
      return
    }
    setPending(true)
    try {
      const result = await transactionApi.add({
        accountId: values.accountId ? Number(values.accountId) : null,
        cardNumber: values.cardNumber || null,
        transactionTypeCode: values.transactionTypeCode,
        transactionCategoryCode: Number(values.transactionCategoryCode),
        source: values.source,
        description: values.description,
        amount: values.amount,
        merchantId: Number(values.merchantId),
        merchantName: values.merchantName,
        merchantCity: values.merchantCity,
        merchantZip: values.merchantZip,
        originDate: values.originDate,
        processingDate: values.processingDate,
        confirmation: values.confirmation.toUpperCase(),
      })
      setMessage(`${result.status}: transaction ${result.transaction.transactionId} was created.`)
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageHeader title="Add transaction" description="Capture a transaction and explicitly confirm it with Y." />
      <ErrorMessage error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      <form className="data-form" onSubmit={submit} noValidate>
        <p className="hint">
          Provide either account ID or card number. Amount requires + or -, 1–8 digits, and exactly two decimals (for
          example, +12.50).
        </p>
        {Object.entries({
          accountId: 'Account ID',
          cardNumber: 'Card number',
          transactionTypeCode: 'Type code',
          transactionCategoryCode: 'Category code',
          source: 'Source',
          description: 'Description',
          amount: 'Amount',
          originDate: 'Origin date',
          processingDate: 'Processing date',
          merchantId: 'Merchant ID',
          merchantName: 'Merchant name',
          merchantCity: 'Merchant city',
          merchantZip: 'Merchant ZIP',
          confirmation: 'Confirm (Y)',
        }).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type={key.includes('Date') ? 'date' : 'text'}
              value={values[key]}
              onChange={(event) => set(key, event.target.value)}
            />
          </label>
        ))}
        <SubmitButton pending={pending}>Add confirmed transaction</SubmitButton>
      </form>
    </>
  )
}
