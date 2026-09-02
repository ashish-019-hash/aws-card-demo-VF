import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { HttpError } from '../api/client'
import { cardApi } from '../api/services'
import type { Card, CardSummary, Page } from '../api/types'
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
} from '../components/ui'
const validAccount = (value: string) => !value || /^\d{1,11}$/.test(value)
const validCard = (value: string) => !value || /^\d{16}$/.test(value)
const validExpiry = (value: string) =>
  /^((19[5-9]\d)|(20\d\d))-((0[1-9])|(1[0-2]))-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf())
export function CardListPage() {
  const [accountId, setAccountId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [page, setPage] = useState<Page<CardSummary>>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const load = async (next = 0) => {
    if (!validAccount(accountId) || !validCard(cardNumber)) {
      setError(new Error('Account IDs must be numeric and card numbers must contain 16 digits.'))
      return
    }
    setLoading(true)
    setError(undefined)
    try {
      setPage(await cardApi.list({ accountId, cardNumber, page: next, size: 10 }))
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
      <PageHeader title="Credit cards" description="Browse cards by optional account or card number." />
      <SearchForm
        onSubmit={(event) => {
          event.preventDefault()
          void load()
        }}
      >
        <label>
          Account ID
          <input value={accountId} onChange={(event) => setAccountId(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Card number
          <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} inputMode="numeric" />
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
                  <th>Card number</th>
                  <th>Account</th>
                  <th>Cardholder</th>
                  <th>Status</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((card) => (
                  <tr key={card.cardNumber}>
                    <td>
                      <Link to={`/cards/${card.cardNumber}`}>{card.cardNumber}</Link>
                    </td>
                    <td>{card.accountId}</td>
                    <td>{card.embossedName}</td>
                    <td>{card.activeStatus}</td>
                    <td>{card.expirationDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} onChange={(next) => void load(next)} />
          </>
        ) : (
          <Empty>No cards match the supplied filters.</Empty>
        ))}
    </>
  )
}
export function CardDetailPage() {
  const { cardNumber = '' } = useParams()
  const [card, setCard] = useState<Card>()
  const [error, setError] = useState<unknown>()
  useEffect(() => {
    cardApi.get(cardNumber).then(setCard).catch(setError)
  }, [cardNumber])
  return (
    <>
      <BackLink to="/cards">Cards</BackLink>
      <PageHeader title="Card details" description="Review a credit card's maintained information." />
      <ErrorMessage error={error} />
      {!card && !error && <Loading />}
      {card && (
        <section className="details">
          <div className="details-heading">
            <h2>{card.cardNumber}</h2>
            <Link to={`/cards/update?card=${card.cardNumber}`}>Maintain this card</Link>
          </div>
          <dl>
            <dt>Account ID</dt>
            <dd>{card.accountId}</dd>
            <dt>Cardholder</dt>
            <dd>{card.embossedName}</dd>
            <dt>Status</dt>
            <dd>{card.activeStatus}</dd>
            <dt>Expiry</dt>
            <dd>{card.expirationDate}</dd>
            <dt>CVV code</dt>
            <dd>{card.cvvCode}</dd>
          </dl>
        </section>
      )}
    </>
  )
}
export function CardLookupPage() {
  const navigate = useNavigate()
  const [card, setCard] = useState('')
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{16}$/.test(card)) {
      setError('Enter a 16-digit card number.')
      return
    }
    navigate(`/cards/${card}`)
  }
  return (
    <>
      <PageHeader title="Card lookup" description="Find a card by its 16-digit identifier." />
      <SearchForm onSubmit={submit}>
        <label>
          Card number
          <input value={card} onChange={(event) => setCard(event.target.value)} inputMode="numeric" />
        </label>
        <button>Find card</button>
      </SearchForm>
      {error && <Notice tone="error">{error}</Notice>}
    </>
  )
}
export function CardUpdatePage() {
  const [searchParams] = useSearchParams()
  const initial = searchParams.get('card') ?? ''
  const [cardNumber, setCardNumber] = useState(initial)
  const [card, setCard] = useState<Card>()
  const [values, setValues] = useState({ embossedName: '', activeStatus: '', expirationDate: '' })
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const retrieve = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!/^\d{16}$/.test(cardNumber)) {
      setError(new Error('Card number must contain 16 digits.'))
      return
    }
    setPending(true)
    try {
      const item = await cardApi.get(cardNumber)
      setCard(item)
      setValues({
        embossedName: item.embossedName,
        activeStatus: item.activeStatus,
        expirationDate: item.expirationDate,
      })
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  useEffect(() => {
    if (initial) void retrieve()
  }, [])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!card) return
    if (
      !/^[A-Za-z ]+$/.test(values.embossedName) ||
      !/^[YN]$/.test(values.activeStatus) ||
      !validExpiry(values.expirationDate)
    ) {
      setError(new Error('Use an alphabetic cardholder name, Y or N status, and a valid expiry date from 1950–2099.'))
      return
    }
    setPending(true)
    try {
      await cardApi.update(card.cardNumber, { ...values, expectedVersion: card.version })
      const refreshed = await cardApi.get(card.cardNumber)
      setCard(refreshed)
      setValues({
        embossedName: refreshed.embossedName,
        activeStatus: refreshed.activeStatus,
        expirationDate: refreshed.expirationDate,
      })
      setMessage('Card changes saved. Current version was refreshed.')
      setError(undefined)
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) {
        try {
          const refreshed = await cardApi.get(card.cardNumber)
          setCard(refreshed)
          setValues({
            embossedName: refreshed.embossedName,
            activeStatus: refreshed.activeStatus,
            expirationDate: refreshed.expirationDate,
          })
          setError(
            new Error('This card changed elsewhere. Current details were reloaded; review them before saving again.'),
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
  return (
    <>
      <PageHeader
        title="Card maintenance"
        description="Retrieve a card, update its holder, status, or expiry date, and save changes."
      />
      <SearchForm onSubmit={retrieve}>
        <label>
          Card number
          <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} inputMode="numeric" />
        </label>
        <SubmitButton pending={pending}>Retrieve card</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {card && (
        <form className="data-form compact" onSubmit={save}>
          <label>
            Cardholder name
            <input
              value={values.embossedName}
              onChange={(event) => setValues({ ...values, embossedName: event.target.value })}
            />
          </label>
          <label>
            Active status (Y/N)
            <input
              maxLength={1}
              value={values.activeStatus}
              onChange={(event) => setValues({ ...values, activeStatus: event.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Expiry date
            <input
              type="date"
              value={values.expirationDate}
              onChange={(event) => setValues({ ...values, expirationDate: event.target.value })}
            />
          </label>
          <SubmitButton pending={pending}>Save changes</SubmitButton>
        </form>
      )}
    </>
  )
}
