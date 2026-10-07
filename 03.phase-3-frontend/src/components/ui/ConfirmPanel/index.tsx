import type { ReactNode } from 'react'
import { Button } from '../Button'
import { cx } from '../cx'
import styles from './ConfirmPanel.module.css'

export interface ConfirmPanelProps {
  message: ReactNode
  /** Affirmative button label, for example "Yes, add". */
  confirmLabel: string
  cancelLabel?: string
  /**
   * Receives 'Y' or 'N', matching the legacy CONFIRM field so Step 3 can send
   * the backend confirmation value unchanged.
   */
  onResult: (value: 'Y' | 'N') => void
  /** Disables both buttons and shows a spinner on the affirmative one. */
  busy?: boolean
  className?: string
}

/** Inline confirmation panel replacing the legacy CONFIRM Y/N field. */
export function ConfirmPanel({ message, confirmLabel, cancelLabel = 'No', onResult, busy = false, className }: ConfirmPanelProps) {
  return (
    <div className={cx(styles.root, className)} role="group" aria-label="Confirmation">
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" className={styles.yes} loading={busy} onClick={() => onResult('Y')}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" className={styles.no} disabled={busy} onClick={() => onResult('N')}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
