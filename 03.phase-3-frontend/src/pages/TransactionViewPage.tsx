import { TransactionViewScreen } from '../features/transactions/TransactionViewScreen'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'

/** Route `/transactions/view/:transactionId?` — SCREEN-10 COTRN01. */
export function TransactionViewPage() {
  useDocumentTitle('Transaction View')
  return (
    <AppShell>
      <TransactionViewScreen />
    </AppShell>
  )
}

export default TransactionViewPage
