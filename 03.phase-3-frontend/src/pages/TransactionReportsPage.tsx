import { ReportRequestScreen } from '../features/reports/ReportRequestScreen'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'

/** Route `/reports` — SCREEN-12 CORPT00. */
export function TransactionReportsPage() {
  useDocumentTitle('Transaction Reports')
  return (
    <AppShell>
      <ReportRequestScreen />
    </AppShell>
  )
}

export default TransactionReportsPage
