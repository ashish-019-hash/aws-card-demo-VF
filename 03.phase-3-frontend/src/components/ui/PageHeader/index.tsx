import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small uppercase label above the title (for example the module name). */
  eyebrow?: ReactNode
  /** Right-aligned actions on desktop, stacked full-width on mobile. */
  actions?: ReactNode
  /** Legacy screen code rendered as data-screen for test traceability (for example "COACTVW"). */
  screen?: string
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, screen, className }: PageHeaderProps) {
  return (
    <div className={cx(styles.root, className)} data-screen={screen}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  )
}
