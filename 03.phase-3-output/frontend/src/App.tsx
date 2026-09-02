import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { clearCsrfHeaderToken, setCsrfHeaderToken } from './api/client'
import { sessionApi } from './api/services'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import type { Session } from './api/types'
import { SignInPage } from './pages/SignInPage'
import { DashboardPage } from './pages/DashboardPage'
import { AccountLookupPage, AccountUpdatePage } from './pages/AccountPages'
import { CardDetailPage, CardListPage, CardLookupPage, CardUpdatePage } from './pages/CardPages'
import {
  TransactionAddPage,
  TransactionDetailPage,
  TransactionListPage,
  TransactionLookupPage,
} from './pages/TransactionPages'
import { PaymentPage, ReportPage } from './pages/PaymentReportPages'
import { UserFormPage, UserListPage } from './pages/UserPages'

const sessionStorageKey = 'carddemo.session'

function storedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionStorageKey) ?? 'null') as Session | null
  } catch {
    return null
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [checkingSession, setCheckingSession] = useState(true)
  const establishSession = (next: Session) => {
    sessionStorage.setItem(sessionStorageKey, JSON.stringify(next))
    setSession(next)
  }
  const clearSession = () => {
    clearCsrfHeaderToken()
    sessionStorage.removeItem(sessionStorageKey)
    setSession(null)
  }

  useEffect(() => {
    const recover = async () => {
      const saved = storedSession()
      if (!saved) {
        setCheckingSession(false)
        return
      }
      try {
        await sessionApi.restore()
        const csrf = await sessionApi.csrf()
        setCsrfHeaderToken(csrf.token)
      } catch {
        clearSession()
      } finally {
        setCheckingSession(false)
      }
    }
    void recover()
    window.addEventListener('carddemo:unauthenticated', clearSession)
    return () => window.removeEventListener('carddemo:unauthenticated', clearSession)
  }, [])

  if (checkingSession)
    return (
      <div className="app-loading" role="status">
        Checking your secure session…
      </div>
    )
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/sign-in"
          element={session ? <Navigate to="/" replace /> : <SignInPage onSignIn={establishSession} />}
        />
        <Route element={<ProtectedRoute session={session} />}>
          <Route element={<Layout session={session!} onLogout={clearSession} />}>
            <Route index element={<DashboardPage session={session!} />} />
            <Route path="accounts" element={<AccountLookupPage />} />
            <Route path="accounts/update" element={<AccountUpdatePage />} />
            <Route path="cards" element={<CardListPage />} />
            <Route path="cards/detail" element={<CardLookupPage />} />
            <Route path="cards/update" element={<CardUpdatePage />} />
            <Route path="cards/:cardNumber" element={<CardDetailPage />} />
            <Route path="transactions" element={<TransactionListPage />} />
            <Route path="transactions/detail" element={<TransactionLookupPage />} />
            <Route path="transactions/new" element={<TransactionAddPage />} />
            <Route path="transactions/:transactionId" element={<TransactionDetailPage />} />
            <Route path="payments" element={<PaymentPage />} />
            <Route path="reports" element={<ReportPage />} />
            <Route element={<ProtectedRoute session={session} role="ADMINISTRATOR" />}>
              <Route path="users" element={<UserListPage />} />
              <Route path="users/new" element={<UserFormPage mode="add" />} />
              <Route path="users/update" element={<UserFormPage mode="update" />} />
              <Route path="users/delete" element={<UserFormPage mode="delete" />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={session ? '/' : '/sign-in'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
