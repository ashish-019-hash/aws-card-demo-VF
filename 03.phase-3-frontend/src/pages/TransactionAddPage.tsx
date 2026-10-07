import { TransactionAddScreen } from '../features/transactions/TransactionAddScreen'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'

/** Route `/transactions/add` — SCREEN-11 COTRN02. */
export function TransactionAddPage() {
  useDocumentTitle('Transaction Add')
  return (
    <AppShell>
      <TransactionAddScreen />
    </AppShell>
  )
}

export default TransactionAddPage
