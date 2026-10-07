import { ActiveStatusBadge, Badge, Card, DescriptionList } from '../../components/ui'
import { formatMoney, formatPhone, maskSsn } from './format'
import type { AccountProfile } from './service'
import styles from './AccountProfileView.module.css'

export interface AccountProfileViewProps {
  profile: AccountProfile
}

/**
 * Loaded state of Account View (SCREEN-04 COACTVW): balance stats plus the
 * "Account" and "Customer" detail panels, side by side on desktop.
 */
export function AccountProfileView({ profile }: AccountProfileViewProps) {
  const { account, customer } = profile
  const fullName = [customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Current balance</div>
          <div className={styles.statValue}>{formatMoney(account.currentBalance)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Credit limit</div>
          <div className={styles.statValue}>{formatMoney(account.creditLimit)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Cash credit limit</div>
          <div className={styles.statValue}>{formatMoney(account.cashCreditLimit)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Cycle credit / debit</div>
          <div className={styles.statValue}>
            {formatMoney(account.currentCycleCredit)}{' '}
            <span className={styles.statDivider}>/</span>{' '}
            {formatMoney(account.currentCycleDebit)}
          </div>
        </div>
      </div>
      <div className={styles.cards}>
        <Card title="Account" subtitle={`Account ${account.id}`}>
          <DescriptionList
            items={[
              { label: 'Account status', value: <ActiveStatusBadge status={account.activeStatus} /> },
              { label: 'Account group', value: account.groupId, mono: true },
              { label: 'Customer number', value: customer.id, mono: true },
              { label: 'Open date', value: account.openDate, mono: true },
              { label: 'Expiry date', value: account.expirationDate, mono: true },
              { label: 'Reissue date', value: account.reissueDate, mono: true },
            ]}
          />
        </Card>
        <Card title="Customer" subtitle={`Customer ${customer.id}`}>
          <DescriptionList
            items={[
              { label: 'Name', value: fullName },
              { label: 'Date of birth', value: customer.dateOfBirth, mono: true },
              { label: 'FICO score', value: customer.ficoCreditScore, mono: true },
              { label: 'SSN', value: maskSsn(customer.ssn), mono: true },
              { label: 'Government ID', value: customer.governmentIssuedId, mono: true },
              {
                label: 'Primary card holder',
                value:
                  customer.primaryCardholderIndicator === 'Y' ? (
                    <Badge tone="success">Yes</Badge>
                  ) : (
                    <Badge tone="neutral">No</Badge>
                  ),
              },
              {
                label: 'Address',
                value: (
                  <>
                    {customer.addressLine1}
                    {customer.addressLine2 ? `, ${customer.addressLine2}` : ''}
                    <br />
                    {customer.addressLine3}, {customer.addressStateCode} {customer.addressZip},{' '}
                    {customer.addressCountryCode}
                  </>
                ),
              },
              { label: 'Phone 1', value: formatPhone(customer.phoneNumber1), mono: true },
              { label: 'Phone 2', value: formatPhone(customer.phoneNumber2), mono: true },
              { label: 'EFT account ID', value: customer.eftAccountId, mono: true },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
