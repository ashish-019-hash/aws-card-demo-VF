import type { ElementType, ReactNode } from 'react'
import styles from './VisuallyHidden.module.css'

export interface VisuallyHiddenProps {
  as?: ElementType
  children: ReactNode
}

/** Renders content for assistive technology only. */
export function VisuallyHidden({ as: Tag = 'span', children }: VisuallyHiddenProps) {
  return <Tag className={styles.root}>{children}</Tag>
}
