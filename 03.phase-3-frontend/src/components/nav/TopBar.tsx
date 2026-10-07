import { Button, UserTypeBadge } from '../ui'
import { Icon } from '../icons'
import type { Session } from '../../types/session'
import styles from './TopBar.module.css'

export interface TopBarProps {
  session: Session
  /** Current page label shown in the bar. */
  title: string
  menuOpen: boolean
  onOpenMenu: () => void
  onSignOut: () => void
}

/** Top bar: hamburger (below 1024px), current page, signed-in user, role badge and sign out. */
export function TopBar({ session, title, menuOpen, onOpenMenu, onSignOut }: TopBarProps) {
  return (
    <header className={styles.root}>
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={menuOpen}
        aria-controls="mobile-drawer"
        aria-label="Open navigation menu"
        onClick={onOpenMenu}
      >
        <Icon name="menu" size={22} />
      </button>
      <div className={styles.title}>{title}</div>
      <div className={styles.right}>
        <span className={styles.user}>
          <span className={styles.userId}>{session.userId}</span>
          <UserTypeBadge userType={session.userType} />
        </span>
        <Button variant="ghost" size="sm" className={styles.signOut} onClick={onSignOut}>
          <Icon name="signOut" size={16} />
          Sign out
        </Button>
      </div>
    </header>
  )
}
