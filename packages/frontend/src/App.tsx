import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
import OrdersListPage from './pages/OrdersListPage'
import OrderEntryPage from './pages/OrderEntryPage'
import MenuAdminPage from './pages/MenuAdminPage'
import OrderDetailPage from './pages/OrderDetailPage'
import SummaryPage from './pages/SummaryPage'
import CustomersListPage from './pages/CustomersListPage'
import CustomerDetailPage from './pages/CustomerDetailPage'

const queryClient = new QueryClient()

function AppLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/orders/today" element={<OrdersListPage />} />
            <Route path="/orders/new" element={<OrderEntryPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/menu" element={<MenuAdminPage />} />
            <Route path="/summary/today" element={<SummaryPage />} />
            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customers/:phone" element={<CustomerDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
