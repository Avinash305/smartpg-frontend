import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import RequireSubscription from '../components/auth/RequireSubscription';

// Lazy load all page components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Home = lazy(() => import('../pages/public/Home'));
const ShippingDeliveryPolicy = lazy(() => import('../pages/public/ShippingDeliveryPolicy'));
const CancellationRefundPolicy = lazy(() => import('../pages/public/CancellationRefundPolicy'));
const TermsConditions = lazy(() => import('../pages/public/TermsConditions'));
const StaffPage = lazy(() => import('../pages/StaffPage'));
const StaffDetails = lazy(() => import('../components/staffs/StaffDetails'));
const NotFound = lazy(() => import('../pages/NotFound'));
const BuildingsPage = lazy(() => import('../pages/BuildingsPage'));
const BuildingDetails = lazy(() => import('../components/buildings/BuildingDetails'));
const FloorPage = lazy(() => import('../pages/FloorPage'));
const FloorDetails = lazy(() => import('../components/floors/FloorDetails'));
const RoomPage = lazy(() => import('../pages/RoomPage'));
const RoomDetails = lazy(() => import('../components/rooms/RoomDetails'));
const BedPage = lazy(() => import('../pages/BedPage'));
const BedDetails = lazy(() => import('../components/beds/BedDetails'));
const TenantPage = lazy(() => import('../pages/TenantPage'));
const TenantDetails = lazy(() => import('../components/tenants/TenantDetails'));
const BookingsPage = lazy(() => import('../pages/BookingsPage'));
const BookingDetails = lazy(() => import('../components/bookings/BookingDetails'));
const PaymentPage = lazy(() => import('../pages/PaymentPage'));
const ExpensesPage = lazy(() => import('../pages/ExpensesPage'));
const ExpensesDetails = lazy(() => import('../components/expense/ExpensesDetails'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const Notification = lazy(() => import('../pages/Notification'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const BedAvailabilityPage = lazy(() => import('../pages/BedAvailabilityPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));


const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Loading component for Suspense fallback
const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

const AppRouter = () => {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shipping-delivery-policy" element={<ShippingDeliveryPolicy />} />
        <Route path="/cancellation-refund-policy" element={<CancellationRefundPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsConditions />} />

        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        <Route element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="/dashboard" element={<RequireSubscription><Dashboard /></RequireSubscription>} />
          <Route path="/staffs" element={<RequireSubscription><StaffPage /></RequireSubscription>} />
          <Route path="/staffs/:id" element={<RequireSubscription><StaffDetails /></RequireSubscription>} />
          <Route path="/buildings" element={<RequireSubscription><BuildingsPage /></RequireSubscription>} />
          <Route path="/buildings/:id" element={<RequireSubscription><BuildingDetails /></RequireSubscription>} />
          <Route path="/floors" element={<RequireSubscription><FloorPage /></RequireSubscription>} />
          <Route path="/floors/:id" element={<RequireSubscription><FloorDetails /></RequireSubscription>} />
          <Route path="/rooms" element={<RequireSubscription><RoomPage /></RequireSubscription>} />
          <Route path="/rooms/:id" element={<RequireSubscription><RoomDetails /></RequireSubscription>} />
          <Route path="/beds" element={<RequireSubscription><BedPage /></RequireSubscription>} />
          <Route path="/beds/:id" element={<RequireSubscription><BedDetails /></RequireSubscription>} />
          <Route path="/tenants" element={<RequireSubscription><TenantPage /></RequireSubscription>} />
          <Route path="/tenants/:id" element={<RequireSubscription><TenantDetails /></RequireSubscription>} />
          <Route path="/bookings" element={<RequireSubscription><BookingsPage /></RequireSubscription>} />
          <Route path="/bookings/:id" element={<RequireSubscription><BookingDetails /></RequireSubscription>} />
          <Route path="/payments" element={<RequireSubscription><PaymentPage /></RequireSubscription>} />
          <Route path="/expenses" element={<RequireSubscription><ExpensesPage /></RequireSubscription>} />
          <Route path="/expenses/:id" element={<RequireSubscription><ExpensesDetails /></RequireSubscription>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<RequireSubscription><Notification /></RequireSubscription>} />
          <Route path="/profile" element={<RequireSubscription><ProfilePage /></RequireSubscription>} />
          <Route path="/bed-availability" element={<RequireSubscription><BedAvailabilityPage /></RequireSubscription>} />
          <Route path="/support" element={<SupportPage/> } />
          
          {/* Authenticated 404 inside Layout */}
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;