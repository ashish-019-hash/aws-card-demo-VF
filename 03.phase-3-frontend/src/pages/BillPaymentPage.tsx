import { BillPaymentScreen } from '../features/billing/BillPaymentScreen'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'

/** Route `/bill-payment` — SCREEN-13 COBIL00. */
export function BillPaymentPage() {
  useDocumentTitle('Bill Payment')
  return (
    <AppShell>
      <BillPaymentScreen />
    </AppShell>
  )
}

export default BillPaymentPage
