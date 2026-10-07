import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './DescriptionList.module.css'

export interface DescriptionItem {
  label: ReactNode
  value: ReactNode
  /** Monospace value styling for numbers and identifiers. */
  mono?: boolean
}

export interface DescriptionListProps {
  items: DescriptionItem[]
  /** 2 columns on desktop (collapses to 1 on mobile) or always 1. */
  columns?: 1 | 2
  className?: string
}

/** Label/value grid for read-only detail screens. */
export function DescriptionList({ items, columns = 2, className }: DescriptionListProps) {
  return (
    <dl className={cx(styles.root, columns === 2 && styles.two, className)}>
      {items.map((item, index) => (
        <div key={index} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={cx(styles.value, item.mono && styles.mono)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
