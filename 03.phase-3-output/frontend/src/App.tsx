import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AdminGate } from './auth/AdminGate'
import { SignOnPage } from './pages/SignOnPage'
import { MenuPage } from './pages/MenuPage'
import { AccountViewPage } from './pages/AccountViewPage'
import { AccountUpdatePage } from './pages/AccountUpdatePage'
import { CardListPage } from './pages/CardListPage'
import { CardViewPage } from './pages/CardViewPage'
import { CardUpdatePage } from './pages/CardUpdatePage'
import { TransactionListPage } from './pages/TransactionListPage'
import { TransactionViewPage } from './pages/TransactionViewPage'
import { TransactionAddPage } from './pages/TransactionAddPage'
import { BillPaymentPage } from './pages/BillPaymentPage'
import { ReportPage } from './pages/ReportPage'
import { UserListPage } from './pages/UserListPage'
import { UserAddPage } from './pages/UserAddPage'
import { UserUpdatePage } from './pages/UserUpdatePage'
import { UserDeletePage } from './pages/UserDeletePage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signon" element={<SignOnPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/menu" element={<MenuPage admin={false} />} />
        <Route path="/admin" element={<MenuPage admin={true} />} />

        <Route path="/accounts/view" element={<AccountViewPage />} />
        <Route path="/accounts/update" element={<AccountUpdatePage />} />

        <Route path="/cards" element={<CardListPage />} />
        <Route path="/cards/view" element={<CardViewPage />} />
        <Route path="/cards/update" element={<CardUpdatePage />} />

        <Route path="/transactions" element={<TransactionListPage />} />
        <Route path="/transactions/view" element={<TransactionViewPage />} />
        <Route path="/transactions/add" element={<TransactionAddPage />} />

        <Route path="/bill-payment" element={<BillPaymentPage />} />
        <Route path="/reports" element={<ReportPage />} />

        <Route
          path="/users"
          element={
            <AdminGate screenId="COUSR00C" title="List Users">
              <UserListPage />
            </AdminGate>
          }
        />
        <Route
          path="/users/add"
          element={
            <AdminGate screenId="COUSR01C" title="Add User">
              <UserAddPage />
            </AdminGate>
          }
        />
        <Route
          path="/users/update"
          element={
            <AdminGate screenId="COUSR02C" title="Update User">
              <UserUpdatePage />
            </AdminGate>
          }
        />
        <Route
          path="/users/delete"
          element={
            <AdminGate screenId="COUSR03C" title="Delete User">
              <UserDeletePage />
            </AdminGate>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/signon" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
