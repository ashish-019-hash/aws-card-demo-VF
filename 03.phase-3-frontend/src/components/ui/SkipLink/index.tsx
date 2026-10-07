import styles from './SkipLink.module.css'

export interface SkipLinkProps {
  targetId?: string
}

/** First focusable element on every screen; jumps to the main landmark. */
export function SkipLink({ targetId = 'main-content' }: SkipLinkProps) {
  return (
    <a className={styles.root} href={`#${targetId}`}>
      Skip to main content
    </a>
  )
}
