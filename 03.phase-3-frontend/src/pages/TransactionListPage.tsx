import { TransactionListScreen } from '../features/transactions/TransactionListScreen'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'

/** Route `/transactions` — SCREEN-09 COTRN00. */
export function TransactionListPage() {
  useDocumentTitle('Transaction List')
  return (
    <AppShell>
      <TransactionListScreen />
    </AppShell>
  )
}

export default TransactionListPage
