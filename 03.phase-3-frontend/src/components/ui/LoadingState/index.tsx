import type { CSSProperties } from 'react'
import { cx } from '../cx'
import styles from './LoadingState.module.css'

export interface LoadingStateProps {
  label?: string
  className?: string
}

/** Spinner with a text label, announced through role="status". */
export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={cx(styles.root, className)} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export interface SkeletonProps {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  className?: string
}

/** Decorative shimmer placeholder; hidden from assistive technology. */
export function Skeleton({ width, height, className }: SkeletonProps) {
  return <span className={cx(styles.skeleton, className)} style={{ width, height }} aria-hidden="true" />
}
