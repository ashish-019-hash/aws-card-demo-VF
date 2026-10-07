import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Button, MessageBar, TextField } from '../components/ui'
import { signInSchema } from '../features/auth/signInSchema'
import type { SignInFormValues } from '../features/auth/signInSchema'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSession } from '../hooks/useSession'
import { AuthLayout } from '../layouts/AuthLayout'
import { ApiError, api } from '../services/api'
import styles from './SignInPage.module.css'

/** SCREEN-01 COSGN00 — application sign-on (STORY-001, STORY-003). */
export function SignInPage() {
  useDocumentTitle('Sign on')
  const { session, signIn } = useSession()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    defaultValues: { userId: '', password: '' },
  })

  if (session) {
    // Already signed in: go to the role home.
    return <Navigate to="/" replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null)
    setSubmitting(true)
    try {
      const result = await api.auth.login(values.userId.trim().toUpperCase(), values.password)
      signIn({ userId: result.userId, userType: result.userType })
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status === 401
          ? 'User ID or password is incorrect. Try again.'
          : error instanceof Error
            ? error.message
            : 'Sign on failed. Try again.',
      )
      setSubmitting(false)
    }
  })

  return (
    <AuthLayout>
      <div data-screen="COSGN00">
        <h1 className={styles.title}>Sign on</h1>
        <p className={styles.lead}>Enter your CardDemo credentials to continue.</p>
        {message ? (
          <MessageBar tone="error" className={styles.message}>
            {message}
          </MessageBar>
        ) : null}
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <TextField
            label="User ID"
            mono
            maxLength={8}
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            requiredIndicator
            hint="Up to 8 characters. Letters are converted to upper case."
            error={errors.userId?.message}
            {...register('userId', {
              onBlur: (event) => setValue('userId', event.target.value.toUpperCase()),
            })}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            maxLength={8}
            autoComplete="current-password"
            requiredIndicator
            hint="Up to 8 characters."
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={showPassword}
                aria-label="Show password"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
            {...register('password')}
          />
          <Button type="submit" variant="primary" block loading={submitting}>
            Sign in
          </Button>
          <Link to="/exit" className={styles.exitLink}>
            Exit application
          </Link>
        </form>
        <p className={styles.foot}>
          <Icon name="lock" size={14} />
          Access is limited to authorised staff.
        </p>
      </div>
    </AuthLayout>
  )
}

export default SignInPage
