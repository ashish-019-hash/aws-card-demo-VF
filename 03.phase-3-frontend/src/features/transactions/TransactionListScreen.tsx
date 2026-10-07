import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  MessageBar,
  PageHeader,
  Pagination,
  TextField,
  type DataTableColumn,
  type MessageTone,
} from '../../components/ui'
import type { AsyncState } from '../../types/async'
import type { TransactionListRow } from '../../types/transaction'
import {
  transactionListFilterSchema,
  type TransactionListFilterFormValues,
} from '../../validation/transactionListFilter'
import { formatCurrency } from './format'
import { fetchTransactionPage, toErrorMessage, TRANSACTIONS_PAGE_SIZE } from './service'
import styles from './transactions.module.css'

interface ListPage {
  rows: TransactionListRow[]
  hasNext: boolean
}

interface PageMessage {
  tone: MessageTone
  text: string
}

/** SCREEN-09 COTRN00 — browse transactions ten per page (STORY-012/013). */
export function TransactionListScreen() {
  const navigate = useNavigate()
  const [listState, setListState] = useState<AsyncState<ListPage>>({ status: 'loading' })
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState<PageMessage | null>(null)
  // Increments per request so stale (superseded or unmounted) responses are ignored.
  const requestSeqRef = useRef(0)

  const { register, handleSubmit, reset, formState } = useForm<TransactionListFilterFormValues>({
    resolver: zodResolver(transactionListFilterSchema),
    mode: 'onBlur',
    defaultValues: { transactionId: '' },
  })

  async function loadPage(nextFilter: string | undefined, nextPage: number) {
    const seq = ++requestSeqRef.current
    setListState({ status: 'loading' })
    try {
      const data = await fetchTransactionPage(nextFilter, nextPage)
      if (seq !== requestSeqRef.current) return
      setListState({ status: 'success', data })
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      setListState({
        status: 'error',
        message: toErrorMessage(error, 'Unable to lookup transactions. The transaction file could not be read.'),
      })
    }
  }

  useEffect(() => {
    void loadPage(undefined, 0)
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyFilter(values: TransactionListFilterFormValues) {
    const nextFilter = values.transactionId?.trim() ? values.transactionId.trim() : undefined
    setMessage(null)
    setFilter(nextFilter)
    setPage(0)
    void loadPage(nextFilter, 0)
  }

  function clearFilter() {
    reset({ transactionId: '' })
    setMessage(null)
    setFilter(undefined)
    setPage(0)
    void loadPage(undefined, 0)
  }

  function goToPrevious() {
    if (page === 0) {
      setMessage({ tone: 'info', text: 'You are already at the top of the page.' })
      return
    }
    setMessage(null)
    setPage(page - 1)
    void loadPage(filter, page - 1)
  }

  function goToNext() {
    if (listState.status === 'success' && !listState.data.hasNext) {
      setMessage({ tone: 'info', text: 'You are already at the bottom of the page.' })
      return
    }
    setMessage(null)
    setPage(page + 1)
    void loadPage(filter, page + 1)
  }

  const columns: Array<DataTableColumn<TransactionListRow>> = [
    { key: 'id', header: 'Transaction ID', cell: (row) => row.id, mono: true },
    { key: 'date', header: 'Date', cell: (row) => row.date },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className={styles.truncate} title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      mono: true,
      cell: (row) => (
        <span className={row.amount.startsWith('-') ? styles.negative : undefined}>{formatCurrency(row.amount)}</span>
      ),
    },
  ]

  const rows = listState.status === 'success' ? listState.data.rows : []
  const showEmpty = listState.status === 'success' && rows.length === 0

  return (
    <>
      <PageHeader
        screen="COTRN00"
        eyebrow="Transactions"
        title="Transaction List"
        description="Browse posted transactions ten per page. Enter a transaction ID to start the list from it."
        actions={
          <Button variant="secondary" onClick={() => navigate('/menu')}>
            Back to menu
          </Button>
        }
      />

      {message ? (
        <MessageBar tone={message.tone} onDismiss={() => setMessage(null)} className={styles.messageSlot}>
          {message.text}
        </MessageBar>
      ) : null}

      <Card title="Filter" className={styles.messageSlot}>
        <form className={styles.filterForm} onSubmit={handleSubmit(applyFilter)} noValidate>
          <TextField
            label="Start from transaction ID"
            mono
            inputMode="numeric"
            maxLength={16}
            error={formState.errors.transactionId?.message}
            fieldClassName={styles.filterField}
            {...register('transactionId')}
          />
          <Button type="submit" variant="secondary" className={styles.filterButton}>
            Go
          </Button>
        </form>
      </Card>

      {listState.status === 'error' ? (
        <Card title="Transactions">
          <div className={styles.errorState}>
            <MessageBar tone="error">{listState.message}</MessageBar>
            <Button variant="secondary" onClick={() => clearFilter()}>
              Try again
            </Button>
          </div>
        </Card>
      ) : showEmpty ? (
        <Card title="Transactions">
          <EmptyState
            title="No transactions to display"
            message="There are no transactions on file from this ID onwards. Clear the ID to start from the top."
            action={
              <Button variant="secondary" onClick={() => clearFilter()}>
                Clear and start from top
              </Button>
            }
          />
        </Card>
      ) : (
        <Card
          title="Transactions"
          subtitle={`Page ${page + 1} · ${TRANSACTIONS_PAGE_SIZE} per page`}
          flush
          footer={<Pagination page={page + 1} onPrevious={goToPrevious} onNext={goToNext} />}
        >
          <DataTable
            caption="Transactions"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={listState.status === 'loading'}
            skeletonRows={TRANSACTIONS_PAGE_SIZE}
            rowActions={(row) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/transactions/view/${row.id}`, { state: { from: '/transactions' } })}
              >
                View
              </Button>
            )}
          />
        </Card>
      )}
    </>
  )
}
