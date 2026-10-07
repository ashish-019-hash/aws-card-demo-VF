import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './Badge.module.css'

export type BadgeTone = 'success' | 'neutral' | 'danger' | 'warning' | 'brand'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

/** Status pill. Color is never the only signal: the badge always carries text. */
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return <span className={cx(styles.root, styles[tone], className)}>{children}</span>
}

/** Renders the legacy Y/N active status flag as Active/Inactive. */
export function ActiveStatusBadge({ status }: { status: string }) {
  return status === 'Y' ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>
}

/** Renders the legacy A/U user type as Admin/User. */
export function UserTypeBadge({ userType }: { userType: string }) {
  return userType === 'A' ? <Badge tone="brand">Admin</Badge> : <Badge tone="neutral">User</Badge>
}
