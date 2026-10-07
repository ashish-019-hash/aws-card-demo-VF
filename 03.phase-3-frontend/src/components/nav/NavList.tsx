import { NavLink } from 'react-router-dom'
import { Icon } from '../icons'
import { cx } from '../ui/cx'
import type { Session } from '../../types/session'
import styles from './NavList.module.css'
import { groupNavItems, homeLabelForUserType, homePathForUserType, navItemsForUserType } from './navItems'

export interface NavListProps {
  session: Session
  /** Accessible name of the navigation landmark. */
  ariaLabel: string
}

/** Role-aware navigation links shared by the desktop side nav and the mobile drawer. */
export function NavList({ session, ariaLabel }: NavListProps) {
  const items = navItemsForUserType(session.userType)
  const linkClassName = ({ isActive }: { isActive: boolean }) => cx(styles.link, isActive && styles.active)

  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      <NavLink to={homePathForUserType(session.userType)} end className={linkClassName}>
        <Icon name="home" />
        {homeLabelForUserType(session.userType)}
      </NavLink>
      {groupNavItems(items).map(([group, groupItems]) => (
        <div key={group} className={styles.group}>
          <div className={styles.groupLabel}>{group}</div>
          {groupItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClassName}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
