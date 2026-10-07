import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  title: ReactNode
  message?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, message, action, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.root, className)}>
      <h3 className={styles.title}>{title}</h3>
      {message ? <p className={styles.message}>{message}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
