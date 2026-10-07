import type { ReactNode } from 'react'
import '../styles/tokens.css'
import '../styles/base.css'
import { Icon } from '../components/icons'
import { SkipLink } from '../components/ui'
import styles from './AuthLayout.module.css'

export interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Signed-out frame for sign-on, exit and not-found: navy brand panel beside
 * (desktop) or above (mobile) a centered card.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.root}>
      <SkipLink />
      <section className={styles.brand} aria-label="About CardDemo">
        <div>
          <div className={styles.brandName}>
            <span className={styles.mark}>
              <Icon name="card" />
            </span>
            CardDemo
          </div>
          <p className={styles.headline}>Credit card servicing for accounts, cards and transactions</p>
          <p className={styles.blurb}>
            Look up and maintain customer accounts and cards, record transactions, pay bills and request reports.
          </p>
        </div>
        <dl className={styles.meta}>
          <div className={styles.metaItem}>
            <dt>Application</dt>
            <dd>CARDDEMO</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>System</dt>
            <dd>CICS01</dd>
          </div>
        </dl>
      </section>
      <main id="main-content" tabIndex={-1} className={styles.panel}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  )
}
