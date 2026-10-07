import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState, MessageBar, PageHeader, TextField } from '../../components/ui'
import type { AsyncState } from '../../types/async'
import type { Transaction } from '../../types/transaction'
import { ApiError, api } from '../../services/api'
import { transactionSearchSchema, type TransactionSearchFormValues } from '../../validation/transactionSearch'
import { normalizeTransactionId, toTransaction } from './service'
import { TransactionDetailCards } from './TransactionDetailCards'
import styles from './transactions.module.css'

/** SCREEN-10 COTRN01 — view one transaction (STORY-014). */
export function TransactionViewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { transactionId: transactionIdParam } = useParams<{ transactionId?: string }>()
  const fromList = (location.state as { from?: string } | null)?.from === '/transactions'
  const backTo = fromList ? '/transactions' : '/menu'

  const [lookupState, setLookupState] = useState<AsyncState<Transaction>>(
    transactionIdParam ? { status: 'loading' } : { status: 'idle' },
  )
  // Increments per request so stale (superseded or unmounted) responses are ignored.
  const requestSeqRef = useRef(0)

  const { register, handleSubmit, reset, setFocus, formState } = useForm<TransactionSearchFormValues>({
    resolver: zodResolver(transactionSearchSchema),
    mode: 'onBlur',
    defaultValues: { transactionId: transactionIdParam ?? '' },
  })

  // RULE-VAL-052 (Tran ID required) is enforced by the schema before this
  // runs; existence (RULE-VAL-053) stays server-backed.
  async function lookUp(transactionId: string) {
    const trimmed = transactionId.trim()
    const seq = ++requestSeqRef.current
    setLookupState({ status: 'loading' })
    try {
      const dto = await api.transactions.get(normalizeTransactionId(trimmed))
      if (seq !== requestSeqRef.current) return
      setLookupState({ status: 'success', data: toTransaction(dto) })
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      const message =
        error instanceof ApiError && error.status === 404
          ? 'Transaction ID NOT found.'
          : error instanceof ApiError
            ? error.message
            : 'Unable to lookup transaction.'
      setLookupState({ status: 'error', message })
      setFocus('transactionId')
    }
  }

  useEffect(() => {
    if (transactionIdParam) {
      reset({ transactionId: transactionIdParam })
      void lookUp(transactionIdParam)
    }
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionIdParam])

  // Legacy F4: clear the screen for a fresh lookup.
  function clear() {
    requestSeqRef.current += 1
    reset({ transactionId: '' })
    setLookupState({ status: 'idle' })
    setFocus('transactionId')
  }

  return (
    <>
      <PageHeader
        screen="COTRN01"
        eyebrow="Transactions"
        title="Transaction View"
        description="Every stored detail of a single transaction."
        actions={
          <Button variant="secondary" onClick={() => navigate(backTo)}>
            {fromList ? 'Back to transaction list' : 'Back to menu'}
          </Button>
        }
      />

      {lookupState.status === 'error' ? (
        <MessageBar tone="error" className={styles.messageSlot}>
          {lookupState.message}
        </MessageBar>
      ) : null}

      <Card title="Find a transaction">
        <form className={styles.searchForm} onSubmit={handleSubmit((values) => void lookUp(values.transactionId))} noValidate>
          <TextField
            label="Transaction ID"
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={16}
            error={formState.errors.transactionId?.message}
            fieldClassName={styles.searchField}
            {...register('transactionId')}
          />
          <div className={styles.searchActions}>
            <Button type="submit" loading={lookupState.status === 'loading'}>
              Look up
            </Button>
            <Button variant="secondary" onClick={clear}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {lookupState.status === 'loading' ? (
        <div className={styles.detailGrid}>
          <Card>
            <LoadingState label="Loading transaction…" />
          </Card>
        </div>
      ) : null}

      {lookupState.status === 'success' ? <TransactionDetailCards transaction={lookupState.data} /> : null}

      {lookupState.status === 'idle' || lookupState.status === 'error' ? (
        <div className={styles.detailGrid}>
          <Card>
            <EmptyState
              title="No transaction loaded"
              message="Enter a transaction ID above, or open one from the transaction list."
              action={
                <Button variant="secondary" onClick={() => navigate('/transactions')}>
                  Open transaction list
                </Button>
              }
            />
          </Card>
        </div>
      ) : null}
    </>
  )
}
