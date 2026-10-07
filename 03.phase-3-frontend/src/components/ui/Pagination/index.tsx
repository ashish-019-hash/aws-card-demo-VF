import { Button } from '../Button'
import { cx } from '../cx'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  /**
   * Boundary behaviour mirrors the legacy browse: both buttons stay enabled,
   * and the page shows "NO PREVIOUS PAGES TO DISPLAY" / "NO MORE PAGES TO
   * DISPLAY" through its MessageBar when a boundary is crossed.
   */
  onPrevious: () => void
  onNext: () => void
  className?: string
}

/** Previous/Next pager. The legacy browse has no total count, so none is shown. */
export function Pagination({ page, onPrevious, onNext, className }: PaginationProps) {
  return (
    <nav className={cx(styles.root, className)} aria-label="Pagination">
      <span>Page {page}</span>
      <div className={styles.buttons}>
        <Button variant="secondary" size="sm" onClick={onPrevious}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext}>
          Next
        </Button>
      </div>
    </nav>
  )
}
