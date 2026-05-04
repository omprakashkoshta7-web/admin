import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './components/layout/AdminLayout';
import AdminLogin from './components/AdminLogin';
import SessionPage from './pages/auth/SessionPage';
import ProfilePage from './pages/auth/ProfilePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import OrderListPage from './pages/orders/OrderListPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import SLADashboardPage from './pages/orders/SLADashboardPage';
import VendorListPage from './pages/vendors/VendorListPage';
import VendorDetailPage from './pages/vendors/VendorDetailPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import StaffListPage from './pages/staff/StaffListPage';
import FinancePage from './pages/finance/FinancePage';
import RefundsPage from './pages/finance/RefundsPage';
import LedgerPage from './pages/finance/LedgerPage';
import WalletOversightPage from './pages/finance/WalletOversightPage';
import GrowthPage from './pages/growth/GrowthPage';
import TicketDashboardPage from './pages/support/TicketDashboardPage';
import TicketDetailPage from './pages/support/TicketDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import PlatformPage from './pages/platform/PlatformPage';
import DeliveryPage from './pages/delivery/DeliveryPage';
import FailureHandlingPage from './pages/failures/FailureHandlingPage';
import ProductsPage from './pages/catalog/ProductsPage';
import CategoriesPage from './pages/catalog/CategoriesPage';
import PricingPage from './pages/catalog/PricingPage';
import BusinessPrintingPage from './pages/catalog/BusinessPrintingPage';
import ImagesPage from './pages/media/ImagesPage';
import { getStoredAdminUser } from './api/auth';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      const user = getStoredAdminUser();
      const token = localStorage.getItem('admin_token');
      
      console.log('Auth Check:', { user: !!user, token: !!token });
      
      if (user && token) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (login from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLoginSuccess = () => {
    console.log('Login Success - Setting authenticated to true');
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AdminLogin onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/"
            element={isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="orders" element={<OrderListPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="sla" element={<SLADashboardPage />} />
            <Route path="vendors" element={<VendorListPage />} />
            <Route path="vendors/:id" element={<VendorDetailPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="staff" element={<StaffListPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="ledger" element={<LedgerPage />} />
            <Route path="wallet" element={<WalletOversightPage />} />
            <Route path="sessions" element={<SessionPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="growth" element={<GrowthPage />} />
            <Route path="support" element={<TicketDashboardPage />} />
            <Route path="support/:ticketId" element={<TicketDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="platform" element={<PlatformPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="failures" element={<FailureHandlingPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="business-printing" element={<BusinessPrintingPage />} />
            <Route path="images" element={<ImagesPage />} />
          </Route>
          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
