import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './Card.module.css'

export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Right-aligned content in the card header. */
  actions?: ReactNode
  footer?: ReactNode
  /** Removes body padding (used by DataTable so rows reach the card edge). */
  flush?: boolean
  className?: string
  children: ReactNode
}

/** Surface panel with optional header and footer. */
export function Card({ title, subtitle, actions, footer, flush = false, className, children }: CardProps) {
  return (
    <section className={cx(styles.root, className)}>
      {title || actions ? (
        <header className={styles.head}>
          <div>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}
      <div className={cx(styles.body, flush && styles.flush)}>{children}</div>
      {footer ? <footer className={styles.foot}>{footer}</footer> : null}
    </section>
  )
}
