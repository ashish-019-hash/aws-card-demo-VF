import { adminMenuItems } from '../components/nav/navItems'
import { MessageBar, PageHeader } from '../components/ui'
import { MenuGrid } from '../features/menu/MenuGrid'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSession } from '../hooks/useSession'
import { AppShell } from '../layouts/AppShell'
import styles from './AdminMenuPage.module.css'

/** SCREEN-03 COADM01 — admin menu with the four user-security functions (STORY-005). */
export function AdminMenuPage() {
  useDocumentTitle('Admin Menu')
  const { session } = useSession()

  return (
    <AppShell>
      <PageHeader
        screen="COADM01"
        eyebrow="Admin Menu"
        title={session ? `Welcome back, ${session.userId}` : 'Welcome back'}
        description="User security maintenance. These functions are available to administrators only."
      />
      <MessageBar tone="info" className={styles.notice}>
        <strong>Administrator session.</strong> Changes made here affect who can sign on to CardDemo.
      </MessageBar>
      <MenuGrid items={adminMenuItems} />
    </AppShell>
  )
}

export default AdminMenuPage
