import { Card, DescriptionList } from '../../components/ui'
import type { Transaction } from '../../types/transaction'
import { formatCardNumber, formatCurrency } from './format'
import styles from './transactions.module.css'

/** Read-only detail of one transaction in "Transaction" and "Merchant" groups (SCREEN-10). */
export function TransactionDetailCards({ transaction }: { transaction: Transaction }) {
  return (
    <div className={styles.detailGrid}>
      <Card title="Transaction" subtitle={`Transaction ${transaction.id}`}>
        <DescriptionList
          items={[
            {
              label: 'Amount',
              value: (
                <span className={transaction.amount.startsWith('-') ? styles.negative : undefined}>
                  {formatCurrency(transaction.amount)}
                </span>
              ),
              mono: true,
            },
            { label: 'Original date', value: transaction.originationTimestamp, mono: true },
            { label: 'Processing date', value: transaction.processingTimestamp, mono: true },
            { label: 'Transaction ID', value: transaction.id, mono: true },
            { label: 'Card number', value: formatCardNumber(transaction.cardNumber), mono: true },
            { label: 'Source', value: transaction.source },
            { label: 'Type code', value: transaction.transactionTypeCode, mono: true },
            { label: 'Category code', value: transaction.transactionCategoryCode, mono: true },
            { label: 'Description', value: transaction.description },
          ]}
        />
      </Card>
      <Card title="Merchant">
        <DescriptionList
          items={[
            { label: 'Merchant ID', value: transaction.merchantId, mono: true },
            { label: 'Merchant name', value: transaction.merchantName },
            { label: 'Merchant city', value: transaction.merchantCity },
            { label: 'Merchant ZIP', value: transaction.merchantZip, mono: true },
          ]}
        />
      </Card>
    </div>
  )
}
