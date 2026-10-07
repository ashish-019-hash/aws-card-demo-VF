import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, MessageBar, PageHeader } from '../components/ui'
import { userMessages, type PageMessage } from '../features/users/messages'
import { UserForm, type UserFormValues } from '../features/users/UserForm'
import styles from '../features/users/users.module.css'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import { ApiError, api } from '../services/api'

const emptyValues: UserFormValues = {
  firstName: '',
  lastName: '',
  userId: '',
  password: '',
  userType: 'U',
}

/** The documented duplicate-ID message for a conflict, else the API problem detail. */
function addErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 409 ? userMessages.duplicateUserId : error.message
  }
  return error instanceof Error ? error.message : userMessages.lookupFailed
}

/** SCREEN-15 COUSR01 — create a new application user (STORY-022). */
export function UserAddPage() {
  useDocumentTitle('User Add')
  const navigate = useNavigate()
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (values: UserFormValues) => {
    // RULE-VAL-075 required fields (and the backend 8-72 password length) are
    // enforced field-level by userAddSchema before this handler runs;
    // RULE-VAL-076 (duplicate User ID) stays server-backed via the 409 below.
    const userId = values.userId.trim().toUpperCase()
    setMessage(null)
    setSaving(true)
    try {
      const created = await api.users.create(userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
        userType: values.userType === 'A' ? 'A' : 'U',
      })
      setMessage({ tone: 'success', text: userMessages.userAdded(created.id) })
      setFormKey((key) => key + 1)
    } catch (error) {
      setMessage({ tone: 'error', text: addErrorText(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className={styles.stack}>
        <PageHeader
          screen="COUSR01"
          title="User Add"
          description="Create a new application user. All fields are required."
          actions={
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              Back to menu
            </Button>
          }
        />
        {message ? (
          <MessageBar tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </MessageBar>
        ) : null}
        <UserForm
          key={formKey}
          mode="add"
          title="New user"
          defaultValues={emptyValues}
          submitLabel="Add user"
          submitting={saving}
          onSubmit={handleSubmit}
          onClear={() => setMessage(null)}
        />
      </div>
    </AppShell>
  )
}

export default UserAddPage
