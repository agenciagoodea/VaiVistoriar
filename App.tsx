
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import BrokerDashboard from './pages/BrokerDashboard';
import PJDashboard from './pages/PJDashboard';
import UsersPage from './pages/UsersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import PaymentsPage from './pages/PaymentsPage';
import PropertiesPage from './pages/PropertiesPage';
import InspectionsPage from './pages/InspectionsPage';
import ClientsPage from './pages/ClientsPage';
import SettingsPage from './pages/SettingsPage';
import GlobalSettingsPage from './pages/GlobalSettingsPage';
import SystemResourcesPage from './pages/SystemResourcesPage';
import SlidesConfigPage from './pages/SlidesConfigPage';
import StepsConfigPage from './pages/StepsConfigPage';
import TipsConfigPage from './pages/TipsConfigPage';
import ReviewsConfigPage from './pages/ReviewsConfigPage';
import LegalSettingsPage from './pages/LegalSettingsPage';
import HomeConfigPage from './pages/HomeConfigPage';
import PoliciesConfigPage from './pages/PoliciesConfigPage';
import CheckoutConfigPage from './pages/CheckoutConfigPage';
import PlanConfigPage from './pages/PlanConfigPage';
import NewInspectionPage from './pages/NewInspectionPage';
import NewPropertyPage from './pages/NewPropertyPage';
import NewClientPage from './pages/NewClientPage';
import EditClientPage from './pages/EditClientPage';
import EditPropertyPage from './pages/EditPropertyPage';
import EditInspectionPage from './pages/EditInspectionPage';
import ViewInspectionPage from './pages/ViewInspectionPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookieConsent from './components/CookieConsent';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutFailure from './pages/CheckoutFailure';
import CheckoutPending from './pages/CheckoutPending';
import EmailConfigPage from './pages/EmailConfigPage';
import SEOConfigPage from './pages/SEOConfigPage';
import MyPlanPage from './pages/MyPlanPage';
import ReportsPage from './pages/ReportsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import InviteClientPage from './pages/InviteClientPage';
import PublicInspectionPage from './pages/PublicInspectionPage';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'BROKER' | 'PJ'>('ADMIN');
  const [status, setStatus] = useState<string>('Ativo'); // Default to Active to avoid flash of block
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (session: Session | null) => {
      setSession(session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('broker_profiles')
          .select('role, status')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          setRole(profile.role as any);
          setStatus(profile.status || 'Ativo');
        } else if (session.user.user_metadata?.role) {
          setRole(session.user.user_metadata.role);
          setStatus('Ativo'); // Fallback for new users
        }
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/reset-password';
      }
      fetchUserRole(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Checkout Routes */}
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/checkout/failure" element={<CheckoutFailure />} />
        <Route path="/checkout/pending" element={<CheckoutPending />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/client-registration/:id" element={<InviteClientPage />} />
        <Route path="/public/inspection/:id" element={<PublicInspectionPage />} />
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to={role === 'ADMIN' ? '/admin' : role === 'BROKER' ? '/broker' : '/pj'} replace />} />
        <Route path="/register" element={!session ? <LoginPage isRegisterMode={true} /> : <Navigate to={role === 'ADMIN' ? '/admin' : role === 'BROKER' ? '/broker' : '/pj'} replace />} />

        {/* Dashboard Routes wrapper */}
        <Route element={<DashboardLayout role={role} />}>
          {/* Admin Specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/admin/home" element={<HomeConfigPage />} />
            <Route path="/admin/policies" element={<PoliciesConfigPage />} />
            <Route path="/admin/checkout" element={<CheckoutConfigPage />} />
            <Route path="/admin/plans" element={<PlanConfigPage />} />
            <Route path="/admin/email" element={<EmailConfigPage />} />
            <Route path="/admin/seo" element={<SEOConfigPage />} />

            {/* Novas Rotas de Configuração Descentralizadas */}
            <Route path="/admin/global" element={<GlobalSettingsPage />} />
            <Route path="/admin/resources" element={<SystemResourcesPage />} />
            <Route path="/admin/slides" element={<SlidesConfigPage />} />
            <Route path="/admin/steps" element={<StepsConfigPage />} />
            <Route path="/admin/tips" element={<TipsConfigPage />} />
            <Route path="/admin/reviews" element={<ReviewsConfigPage />} />
            <Route path="/admin/legal" element={<LegalSettingsPage />} />
          </Route>

          {/* Shared Admin and PJ Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PJ']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Shared Broker and PJ Routes for Plans */}
          {/* Note: This is where we want them to go if status is Pending, so we enable it. */}
          <Route element={<ProtectedRoute allowedRoles={['BROKER', 'PJ']} userRole={role} isAuthenticated={!!session} status={status} isPlanPage={true} />}>
            <Route path="/broker/plan" element={<MyPlanPage role={role} />} />
            {/* Team page might be blocked if pending? User said "impelling to do any operation on dashboard". 
                 Usually Plan page is allowed. Team page maybe blocked. But let's keep it consistent. 
                 Only Plan Page should be strictly accessible. */}
          </Route>

          {/* Team Page separate to block it on pending */}
          <Route element={<ProtectedRoute allowedRoles={['BROKER', 'PJ']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/team" element={<UsersPage />} />
          </Route>

          {/* Broker Specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['BROKER']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/broker" element={<BrokerDashboard />} />
          </Route>

          {/* PJ Specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['PJ']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/pj" element={<PJDashboard />} />
          </Route>

          {/* Shared Protected Routes (Broker and PJ) */}
          <Route element={<ProtectedRoute allowedRoles={['BROKER', 'PJ']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/new" element={<NewPropertyPage />} />
            <Route path="/properties/edit/:id" element={<EditPropertyPage />} />
            <Route path="/inspections" element={<InspectionsPage />} />
            <Route path="/inspections/new" element={<NewInspectionPage />} />
            <Route path="/inspections/edit/:id" element={<EditInspectionPage />} />
            <Route path="/inspections/view/:id" element={<ViewInspectionPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/new" element={<NewClientPage />} />
            <Route path="/clients/edit/:id" element={<EditClientPage />} />
          </Route>

          {/* Common Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'BROKER', 'PJ']} userRole={role} isAuthenticated={!!session} status={status} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </HashRouter>
  );
};

export default App;
