import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActiveStatusBadge,
  Button,
  Card,
  DataTable,
  MessageBar,
  PageHeader,
  Pagination,
} from '../components/ui'
import type { DataTableColumn, MessageTone } from '../components/ui'
import { CardListFilterForm } from '../features/cards/CardListFilterForm'
import { formatCardNumber } from '../features/cards/format'
import formStyles from '../features/cards/forms.module.css'
import { cardMessages } from '../features/cards/messages'
import { CARD_PAGE_SIZE, fetchCardListPage } from '../features/cards/service'
import type { CardListFilters, CardListPageData } from '../features/cards/service'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'
import type { CardListRow } from '../types/card'

const columns: Array<DataTableColumn<CardListRow>> = [
  { key: 'accountId', header: 'Account', cell: (row) => row.accountId, mono: true },
  {
    key: 'cardNumber',
    header: 'Card number',
    cell: (row) => formatCardNumber(row.cardNumber),
    mono: true,
  },
  { key: 'status', header: 'Status', cell: (row) => <ActiveStatusBadge status={row.activeStatus} /> },
]

interface PageMessage {
  tone: MessageTone
  text: string
}

/** SCREEN-06 COCRDLI — browse cards seven per page with filters (STORY-008/009). */
export function CardListPage() {
  useDocumentTitle('Card List')
  const navigate = useNavigate()

  const [list, setList] = useState<AsyncState<CardListPageData>>({ status: 'idle' })
  const [filters, setFilters] = useState<CardListFilters>({})
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState<PageMessage | null>(null)
  const requestSeqRef = useRef(0)

  const runLookup = (nextFilters: CardListFilters, nextPage: number) => {
    const seq = ++requestSeqRef.current
    setMessage(null)
    setList({ status: 'loading' })
    void fetchCardListPage(nextFilters, nextPage).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this one.
      }
      if (result.ok) {
        setFilters(nextFilters)
        setPage(nextPage)
        setList({ status: 'success', data: result.data })
      } else {
        setList({ status: 'error', message: result.message })
      }
    })
  }

  // The legacy screen shows the first page immediately on entry.
  useEffect(() => {
    runLookup({}, 1)
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = list.status === 'success' ? list.data.rows : []
  const totalPages = list.status === 'success' ? list.data.totalPages : 1

  const handlePrevious = () => {
    if (page <= 1) {
      setMessage({ tone: 'warning', text: cardMessages.noPreviousPages })
    } else {
      runLookup(filters, page - 1)
    }
  }

  const handleNext = () => {
    if (page >= totalPages) {
      setMessage({ tone: 'warning', text: cardMessages.noMorePages })
    } else {
      runLookup(filters, page + 1)
    }
  }

  return (
    <AppShell>
      <PageHeader
        screen="COCRDLI"
        eyebrow="Cards"
        title="Card List"
        description="Browse credit cards seven per page. Filter by account and/or card number, then view or update a card."
        actions={
          <Button variant="secondary" onClick={() => navigate('/menu')}>
            Back
          </Button>
        }
      />
      <div className={formStyles.stack}>
        {message ? (
          <MessageBar tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </MessageBar>
        ) : null}
        <CardListFilterForm
          onApply={(nextFilters) => runLookup(nextFilters, 1)}
          busy={list.status === 'loading'}
        />
        <Card
          title="Cards"
          subtitle={`Showing page ${page} of ${totalPages} · ${CARD_PAGE_SIZE} per page`}
          flush
          footer={
            list.status === 'success' && rows.length > 0 ? (
              <Pagination page={page} onPrevious={handlePrevious} onNext={handleNext} />
            ) : undefined
          }
        >
          <DataTable
            caption="Credit cards"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.cardNumber}
            loading={list.status === 'loading' || list.status === 'idle'}
            error={list.status === 'error' ? list.message : undefined}
            empty={{
              title: 'No cards match these filters',
              message: 'Clear the account or card number filter to see all cards.',
            }}
            skeletonRows={CARD_PAGE_SIZE}
            rowActions={(row) => (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/cards/detail/${row.accountId}/${row.cardNumber}`, {
                      state: { from: '/cards' },
                    })
                  }
                >
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/cards/update/${row.accountId}/${row.cardNumber}`, {
                      state: { from: '/cards' },
                    })
                  }
                >
                  Update
                </Button>
              </>
            )}
          />
        </Card>
      </div>
    </AppShell>
  )
}

export default CardListPage
