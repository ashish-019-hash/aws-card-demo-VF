import type { ReactNode } from 'react'
import { cx } from '../cx'
import { EmptyState } from '../EmptyState'
import { LoadingState, Skeleton } from '../LoadingState'
import { MessageBar } from '../MessageBar'
import styles from './DataTable.module.css'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Monospace cells for identifiers and amounts. */
  mono?: boolean
  /** Omits the column from the stacked card layout below 640px. */
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  /** Visually hidden table caption for screen readers. */
  caption: string
  columns: Array<DataTableColumn<T>>
  rows: T[]
  rowKey: (row: T) => string
  /** Row actions slot; render Button size="sm" controls. */
  rowActions?: (row: T) => ReactNode
  loading?: boolean
  /** Error message; renders a MessageBar instead of rows. */
  error?: string
  /** Empty state shown when rows is empty and there is no error/loading. */
  empty?: { title: ReactNode; message?: ReactNode }
  skeletonRows?: number
  className?: string
}

/**
 * Semantic table at >=640px and a stacked card list below (both rendered,
 * toggled by CSS so no JS media query is needed).
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowActions,
  loading = false,
  error,
  empty,
  skeletonRows = 5,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cx(styles.stateWrap, className)}>
        <LoadingState />
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cx(styles.stateWrap, className)}>
        <MessageBar tone="error">{error}</MessageBar>
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState title={empty?.title ?? 'No records to display'} message={empty?.message} className={className} />
  }

  return (
    <div className={cx(styles.root, className)}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cx(column.align === 'right' && styles.right)}>
                {column.header}
              </th>
            ))}
            {rowActions ? (
              <th scope="col" className={styles.right}>
                <span className={styles.caption}>Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={cx(column.align === 'right' && styles.right, column.mono && styles.mono)}>
                  {column.cell(row)}
                </td>
              ))}
              {rowActions ? (
                <td className={cx(styles.right, styles.actionsCell)}>
                  <span className={styles.rowActions}>{rowActions(row)}</span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className={styles.cards}>
        {rows.map((row) => (
          <li key={rowKey(row)} className={styles.cardItem}>
            {columns
              .filter((column) => !column.hideOnMobile)
              .map((column) => (
                <div key={column.key} className={styles.cardRow}>
                  <span className={styles.cardLabel}>{column.header}</span>
                  <span className={cx(styles.cardValue, column.mono && styles.mono)}>{column.cell(row)}</span>
                </div>
              ))}
            {rowActions ? <div className={styles.cardActions}>{rowActions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
