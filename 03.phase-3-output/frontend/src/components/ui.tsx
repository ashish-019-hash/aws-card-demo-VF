import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../api/client'

export const formatMoney = (value?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0)
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const message =
    error instanceof HttpError
      ? `${error.body.code}: ${error.body.message}`
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred.'
  return <Notice tone="error">{message}</Notice>
}
export function Loading() {
  return (
    <p className="loading" aria-live="polite">
      Loading…
    </p>
  )
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  )
}
export function BackLink({ to, children = 'Back' }: { to: string; children?: ReactNode }) {
  return (
    <Link className="back-link" to={to}>
      ← {children}
    </Link>
  )
}
export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Working…' : children}
    </button>
  )
}
export function SearchForm({
  children,
  onSubmit,
}: {
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      {children}
    </form>
  )
}
export function Pagination({
  page,
  onChange,
}: {
  page: { number: number; totalPages: number; first: boolean; last: boolean }
  onChange: (next: number) => void
}) {
  if (page.totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      <button onClick={() => onChange(page.number - 1)} disabled={page.first}>
        Previous
      </button>
      <span>
        Page {page.number + 1} of {page.totalPages}
      </span>
      <button onClick={() => onChange(page.number + 1)} disabled={page.last}>
        Next
      </button>
    </nav>
  )
}
