import { Link } from 'react-router-dom'
import { Icon } from '../../components/icons'
import type { NavItem } from '../../components/nav/navItems'
import styles from './MenuGrid.module.css'

export interface MenuGridProps {
  items: NavItem[]
}

/**
 * Responsive grid of menu option tiles (3 columns >=1024px, 2 at >=640px,
 * 1 below). The legacy option number is shown as a muted prefix for
 * traceability; the whole tile surface is one link (approved decision 1).
 */
export function MenuGrid({ items }: MenuGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={styles.tile}
          aria-label={`Option ${item.option}: ${item.label}`}
        >
          <div className={styles.row}>
            <span className={styles.icon}>
              <Icon name={item.icon} size={20} />
            </span>
            <span className={styles.num}>OPTION {String(item.option).padStart(2, '0')}</span>
          </div>
          <div className={styles.body}>
            <strong className={styles.title}>{item.label}</strong>
            <span className={styles.description}>{item.description}</span>
          </div>
          <Icon name="chevronRight" size={20} className={styles.chevron} />
        </Link>
      ))}
    </div>
  )
}
