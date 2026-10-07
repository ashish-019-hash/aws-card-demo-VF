import { Icon } from '../icons'
import type { Session } from '../../types/session'
import { NavList } from './NavList'
import styles from './SideNav.module.css'

export interface SideNavProps {
  session: Session
}

/** Fixed navy side navigation, visible at >=1024px. */
export function SideNav({ session }: SideNavProps) {
  return (
    <aside className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.mark}>
          <Icon name="card" />
        </span>
        CardDemo
      </div>
      <NavList session={session} ariaLabel="Main" />
      <div className={styles.spacer} />
      <div className={styles.userChip}>
        <span className={styles.avatar} aria-hidden="true">
          {session.userId.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className={styles.userName}>{session.userId}</div>
          <div className={styles.userMeta}>{session.userType === 'A' ? 'Administrator' : 'Regular user'}</div>
        </div>
      </div>
    </aside>
  )
}
