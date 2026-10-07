import { Route, Routes } from 'react-router-dom'
import { RequireRole, RequireSession, RoleHome } from './components/routing'
import AccountUpdatePage from './pages/AccountUpdatePage'
import AccountViewPage from './pages/AccountViewPage'
import AdminMenuPage from './pages/AdminMenuPage'
import BillPaymentPage from './pages/BillPaymentPage'
import CardDetailPage from './pages/CardDetailPage'
import CardListPage from './pages/CardListPage'
import CardUpdatePage from './pages/CardUpdatePage'
import ExitPage from './pages/ExitPage'
import MainMenuPage from './pages/MainMenuPage'
import NotFoundPage from './pages/NotFoundPage'
import SignInPage from './pages/SignInPage'
import TransactionAddPage from './pages/TransactionAddPage'
import TransactionListPage from './pages/TransactionListPage'
import TransactionReportsPage from './pages/TransactionReportsPage'
import TransactionViewPage from './pages/TransactionViewPage'
import UserAddPage from './pages/UserAddPage'
import UserDeletePage from './pages/UserDeletePage'
import UserListPage from './pages/UserListPage'
import UserUpdatePage from './pages/UserUpdatePage'

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/exit" element={<ExitPage />} />
      <Route element={<RequireSession />}>
        <Route index element={<RoleHome />} />
        <Route element={<RequireRole role="U" />}>
          <Route path="menu" element={<MainMenuPage />} />
          <Route path="accounts/view/:accountId?" element={<AccountViewPage />} />
          <Route path="accounts/update/:accountId?" element={<AccountUpdatePage />} />
          <Route path="cards" element={<CardListPage />} />
          <Route path="cards/detail/:accountId?/:cardNumber?" element={<CardDetailPage />} />
          <Route path="cards/update/:accountId?/:cardNumber?" element={<CardUpdatePage />} />
          <Route path="transactions" element={<TransactionListPage />} />
          <Route path="transactions/view/:transactionId?" element={<TransactionViewPage />} />
          <Route path="transactions/add" element={<TransactionAddPage />} />
          <Route path="reports" element={<TransactionReportsPage />} />
          <Route path="bill-payment" element={<BillPaymentPage />} />
        </Route>
        <Route element={<RequireRole role="A" />}>
          <Route path="admin" element={<AdminMenuPage />} />
          <Route path="admin/users" element={<UserListPage />} />
          <Route path="admin/users/add" element={<UserAddPage />} />
          <Route path="admin/users/update/:userId?" element={<UserUpdatePage />} />
          <Route path="admin/users/delete/:userId?" element={<UserDeletePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
