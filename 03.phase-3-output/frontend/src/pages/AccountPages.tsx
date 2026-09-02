import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HttpError } from '../api/client'
import { accountApi } from '../api/services'
import type { Account } from '../api/types'
import { ErrorMessage, Loading, Notice, PageHeader, SearchForm, SubmitButton, formatMoney } from '../components/ui'

const accountIdCheck = (value: string) => /^\d{1,11}$/.test(value) && value !== '0'
const moneyPattern = /^[+-]?\d{1,10}(?:\.\d{1,2})?$/
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const isCalendarDate = (value: string) => {
  if (!isoDate.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const candidate = new Date(Date.UTC(year, month - 1, day))
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day
}
const localToday = () => {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}
const labelize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())
type Fields = Record<string, string>
const toFields = (object: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value == null ? '' : String(value)]))

export function AccountLookupPage() {
  const [id, setId] = useState('')
  const [account, setAccount] = useState<Account>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const lookup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accountIdCheck(id)) {
      setError(new Error('Enter a non-zero numeric account ID of up to 11 digits.'))
      return
    }
    setLoading(true)
    setError(undefined)
    try {
      setAccount(await accountApi.get(id))
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <PageHeader title="Account lookup" description="View account, linked card, and customer details." />
      <SearchForm onSubmit={lookup}>
        <label>
          Account ID
          <input
            aria-invalid={Boolean(error)}
            value={id}
            onChange={(event) => setId(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <SubmitButton pending={loading}>Find account</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {loading && <Loading />}
      {account && <AccountDetails account={account} />}
    </>
  )
}

export function AccountDetails({ account }: { account: Account }) {
  const customer = account.customer
  return (
    <section className="details">
      <div className="details-heading">
        <h2>Account {account.accountId}</h2>
        <Link to={`/accounts/update?id=${account.accountId}`}>Maintain this account</Link>
      </div>
      <dl>
        <dt>Status</dt>
        <dd>{account.activeStatus}</dd>
        <dt>Current balance</dt>
        <dd>{formatMoney(account.currentBalance)}</dd>
        <dt>Credit limit</dt>
        <dd>{formatMoney(account.creditLimit)}</dd>
        <dt>Cash limit</dt>
        <dd>{formatMoney(account.cashCreditLimit)}</dd>
        <dt>Open date</dt>
        <dd>{account.openDate}</dd>
        <dt>Expiry date</dt>
        <dd>{account.expirationDate}</dd>
        <dt>Account group</dt>
        <dd>{account.accountGroupId}</dd>
      </dl>
      <h3>Customer</h3>
      <dl>
        <dt>Name</dt>
        <dd>
          {customer.firstName} {customer.middleName} {customer.lastName}
        </dd>
        <dt>Address</dt>
        <dd>
          {customer.addressLine1}, {customer.city}, {customer.addressStateCode} {customer.addressZip}
        </dd>
        <dt>Phone</dt>
        <dd>{customer.primaryPhoneNumber || 'Not provided'}</dd>
        <dt>FICO score</dt>
        <dd>{customer.ficoCreditScore}</dd>
      </dl>
      <h3>Linked cards</h3>
      {account.cards.length ? (
        <ul className="item-list">
          {account.cards.map((card) => (
            <li key={card.cardNumber}>
              <Link to={`/cards/${card.cardNumber}`}>{card.cardNumber}</Link> · {card.embossedName} ·{' '}
              {card.activeStatus}
            </li>
          ))}
        </ul>
      ) : (
        <p>No cards are linked to this account.</p>
      )}
    </section>
  )
}

export function AccountUpdatePage() {
  const [searchParams] = useSearchParams()
  const queryId = searchParams.get('id') ?? ''
  const [id, setId] = useState(queryId)
  const [account, setAccount] = useState<Account>()
  const [accountValues, setAccountValues] = useState<Fields>({})
  const [customerValues, setCustomerValues] = useState<Fields>({})
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const populate = (result: Account) => {
    setAccount(result)
    setAccountValues(toFields(result as unknown as Record<string, unknown>))
    setCustomerValues(toFields(result.customer as unknown as Record<string, unknown>))
  }
  const retrieve = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!accountIdCheck(id)) {
      setError(new Error('Enter a non-zero numeric account ID of up to 11 digits.'))
      return
    }
    setPending(true)
    setError(undefined)
    try {
      populate(await accountApi.get(id))
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  useEffect(() => {
    if (queryId) void retrieve()
  }, [])
  const updateAccount = (key: string, value: string) => setAccountValues((old) => ({ ...old, [key]: value }))
  const updateCustomer = (key: string, value: string) => setCustomerValues((old) => ({ ...old, [key]: value }))
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!account) return
    const requiredAccount = [
      'activeStatus',
      'currentBalance',
      'creditLimit',
      'cashCreditLimit',
      'openDate',
      'expirationDate',
      'reissueDate',
      'currentCycleCredit',
      'currentCycleDebit',
      'addressZip',
      'accountGroupId',
    ]
    const requiredCustomer = [
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'addressStateCode',
      'addressCountryCode',
      'addressZip',
      'eftAccountId',
      'primaryCardHolderIndicator',
      'ficoCreditScore',
      'ssn',
      'dateOfBirth',
    ]
    if (
      requiredAccount.some((key) => !accountValues[key]?.trim()) ||
      requiredCustomer.some((key) => !customerValues[key]?.trim())
    ) {
      setError(new Error('Complete all required account and customer fields.'))
      return
    }
    if (!/^[YN]$/.test(accountValues.activeStatus) || !/^[YN]$/.test(customerValues.primaryCardHolderIndicator)) {
      setError(new Error('Status and primary-cardholder indicator must be Y or N.'))
      return
    }
    if (!/^[A-Za-z ]+$/.test(customerValues.firstName) || !/^[A-Za-z ]+$/.test(customerValues.lastName)) {
      setError(new Error('Customer names can contain letters and spaces only.'))
      return
    }
    if (
      !/^\d{3}$/.test(customerValues.ficoCreditScore) ||
      Number(customerValues.ficoCreditScore) < 300 ||
      Number(customerValues.ficoCreditScore) > 850
    ) {
      setError(new Error('FICO score must be from 300 to 850.'))
      return
    }
    if (
      !['currentBalance', 'creditLimit', 'cashCreditLimit', 'currentCycleCredit', 'currentCycleDebit'].every((key) =>
        moneyPattern.test(accountValues[key]),
      )
    ) {
      setError(new Error('Monetary fields must be signed numbers with no more than two decimal places.'))
      return
    }
    if (
      !['openDate', 'expirationDate', 'reissueDate'].every((key) => isCalendarDate(accountValues[key])) ||
      !isCalendarDate(customerValues.dateOfBirth) ||
      customerValues.dateOfBirth >= localToday()
    ) {
      setError(new Error('Enter valid calendar dates; date of birth must be in the past.'))
      return
    }
    setPending(true)
    setError(undefined)
    try {
      const number = (key: string) => Number(accountValues[key])
      await accountApi.update(account.accountId, {
        activeStatus: accountValues.activeStatus,
        currentBalance: number('currentBalance'),
        creditLimit: number('creditLimit'),
        cashCreditLimit: number('cashCreditLimit'),
        openDate: accountValues.openDate,
        expirationDate: accountValues.expirationDate,
        reissueDate: accountValues.reissueDate,
        currentCycleCredit: number('currentCycleCredit'),
        currentCycleDebit: number('currentCycleDebit'),
        addressZip: accountValues.addressZip,
        accountGroupId: accountValues.accountGroupId,
        expectedAccountVersion: account.version,
        expectedCustomerVersion: account.customer.version,
        customer: {
          firstName: customerValues.firstName,
          middleName: customerValues.middleName || null,
          lastName: customerValues.lastName,
          addressLine1: customerValues.addressLine1,
          addressLine2: customerValues.addressLine2 || null,
          city: customerValues.city,
          addressStateCode: customerValues.addressStateCode,
          addressCountryCode: customerValues.addressCountryCode,
          addressZip: customerValues.addressZip,
          primaryPhoneNumber: customerValues.primaryPhoneNumber || null,
          secondaryPhoneNumber: customerValues.secondaryPhoneNumber || null,
          ssn: customerValues.ssn,
          governmentIssuedId: customerValues.governmentIssuedId || null,
          dateOfBirth: customerValues.dateOfBirth,
          eftAccountId: customerValues.eftAccountId,
          primaryCardHolderIndicator: customerValues.primaryCardHolderIndicator,
          ficoCreditScore: Number(customerValues.ficoCreditScore),
        },
      })
      populate(await accountApi.get(String(account.accountId)))
      setMessage('Account and customer changes saved. Current versions were refreshed.')
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) {
        try {
          populate(await accountApi.get(String(account.accountId)))
          setError(
            new Error(
              'This account changed elsewhere. Current details were reloaded; review them before saving again.',
            ),
          )
        } catch (refreshCause) {
          setError(refreshCause)
        }
      } else {
        setError(cause)
      }
    } finally {
      setPending(false)
    }
  }
  const accountFields = [
    'activeStatus',
    'currentBalance',
    'creditLimit',
    'cashCreditLimit',
    'openDate',
    'expirationDate',
    'reissueDate',
    'currentCycleCredit',
    'currentCycleDebit',
    'addressZip',
    'accountGroupId',
  ]
  const customerFields = [
    'firstName',
    'middleName',
    'lastName',
    'addressLine1',
    'addressLine2',
    'city',
    'addressStateCode',
    'addressCountryCode',
    'addressZip',
    'primaryPhoneNumber',
    'secondaryPhoneNumber',
    'ssn',
    'governmentIssuedId',
    'dateOfBirth',
    'eftAccountId',
    'primaryCardHolderIndicator',
    'ficoCreditScore',
  ]
  return (
    <>
      <PageHeader
        title="Account maintenance"
        description="Retrieve an account, update maintained account and customer details, then save."
      />
      <SearchForm onSubmit={retrieve}>
        <label>
          Account ID
          <input value={id} onChange={(event) => setId(event.target.value)} inputMode="numeric" />
        </label>
        <SubmitButton pending={pending}>Retrieve account</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {account && (
        <form className="data-form" onSubmit={save} noValidate>
          <h2>Account {account.accountId}</h2>
          <fieldset>
            <legend>Account details</legend>
            {accountFields.map((key) => (
              <label key={key}>
                {labelize(key)}
                <input
                  aria-invalid={Boolean(error)}
                  type={key.endsWith('Date') ? 'date' : 'text'}
                  value={accountValues[key] ?? ''}
                  onChange={(event) => updateAccount(key, event.target.value)}
                />
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Customer details</legend>
            {customerFields.map((key) => (
              <label key={key}>
                {labelize(key)}
                <input
                  aria-invalid={Boolean(error)}
                  type={key === 'dateOfBirth' ? 'date' : 'text'}
                  value={customerValues[key] ?? ''}
                  onChange={(event) => updateCustomer(key, event.target.value)}
                />
              </label>
            ))}
          </fieldset>
          <SubmitButton pending={pending}>Save changes</SubmitButton>
        </form>
      )}
    </>
  )
}
