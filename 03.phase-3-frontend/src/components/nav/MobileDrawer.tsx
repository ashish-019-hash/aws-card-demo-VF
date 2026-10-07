import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '../icons'
import type { Session } from '../../types/session'
import styles from './MobileDrawer.module.css'
import { NavList } from './NavList'

export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  session: Session
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])'

/**
 * Slide-in navigation for widths below 1024px. Traps focus, closes on Escape
 * and backdrop click, and returns focus to the element that opened it.
 */
export function MobileDrawer({ open, onClose, session }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={styles.panel}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.head}>
          <span className={styles.brand}>
            <span className={styles.mark}>
              <Icon name="card" />
            </span>
            CardDemo
          </span>
          <button ref={closeButtonRef} type="button" className={styles.close} onClick={onClose} aria-label="Close navigation menu">
            <Icon name="close" size={20} />
          </button>
        </div>
        <NavList session={session} ariaLabel="Main" />
        <div className={styles.user}>
          <span className={styles.userId}>{session.userId}</span>
          {session.userType === 'A' ? 'Administrator' : 'Regular user'}
        </div>
      </div>
    </>
  )
}
