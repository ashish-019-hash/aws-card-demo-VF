import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import { cx } from '../cx'
import { VisuallyHidden } from '../VisuallyHidden'
import styles from './MessageBar.module.css'

export type MessageTone = 'info' | 'success' | 'warning' | 'error'

const TONE_PREFIX: Record<MessageTone, string> = {
  info: 'Information:',
  success: 'Success:',
  warning: 'Warning:',
  error: 'Error:',
}

export interface MessageBarProps {
  tone?: MessageTone
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void
  className?: string
  children: ReactNode
}

/** Modern home of the legacy ERRMSG line. Errors announce with role="alert". */
export function MessageBar({ tone = 'info', onDismiss, className, children }: MessageBarProps) {
  return (
    <div className={cx(styles.root, styles[tone], className)} role={tone === 'error' ? 'alert' : 'status'}>
      <VisuallyHidden>{TONE_PREFIX[tone]}</VisuallyHidden>
      <div className={styles.content}>{children}</div>
      {onDismiss ? (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss message">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  )
}
