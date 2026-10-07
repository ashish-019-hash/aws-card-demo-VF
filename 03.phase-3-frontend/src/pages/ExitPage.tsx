import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AuthLayout } from '../layouts/AuthLayout'
import styles from './ExitPage.module.css'

/** Exit node of the legacy flow — thank-you view after leaving the application (STORY-003). */
export function ExitPage() {
  useDocumentTitle('Thank you')

  return (
    <AuthLayout>
      <div className={styles.root} data-screen="EXIT">
        <span className={styles.icon} aria-hidden="true">
          <Icon name="check" size={24} />
        </span>
        <h1 className={styles.title}>Thank you for using CCDA application…</h1>
        <p className={styles.message}>Your CardDemo session has ended.</p>
        <Link to="/sign-in" className={styles.link}>
          Return to sign-in
        </Link>
      </div>
    </AuthLayout>
  )
}

export default ExitPage
