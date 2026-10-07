import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AuthLayout } from '../layouts/AuthLayout'
import styles from './ExitPage.module.css'

/** Fallback for unknown routes. */
export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <AuthLayout>
      <div className={styles.root}>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.message}>The page you requested does not exist in CardDemo.</p>
        <Link to="/" className={styles.link}>
          Go to your menu
        </Link>
      </div>
    </AuthLayout>
  )
}

export default NotFoundPage
