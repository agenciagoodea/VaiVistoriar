
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
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookieConsent from './components/CookieConsent';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutFailure from './pages/CheckoutFailure';
import CheckoutPending from './pages/CheckoutPending';
import EmailConfigPage from './pages/EmailConfigPage';
import MyPlanPage from './pages/MyPlanPage';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'BROKER' | 'PJ'>('ADMIN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.role) {
        setRole(session.user.user_metadata.role);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.role) {
        setRole(session.user.user_metadata.role);
      }
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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Checkout Routes */}
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/checkout/failure" element={<CheckoutFailure />} />
        <Route path="/checkout/pending" element={<CheckoutPending />} />
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/admin" replace />} />
        <Route path="/register" element={!session ? <LoginPage isRegisterMode={true} /> : <Navigate to="/admin" replace />} />

        {/* Dashboard Routes wrapper */}
        <Route element={session ? <DashboardLayout role={role} setRole={setRole} /> : <Navigate to="/login" replace />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/broker" element={<BrokerDashboard />} />
          <Route path="/pj" element={<PJDashboard />} />
          <Route path="/broker/plan" element={<MyPlanPage />} />

          <Route path="/users" element={<UsersPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/home" element={<HomeConfigPage />} />
          <Route path="/admin/policies" element={<PoliciesConfigPage />} />
          <Route path="/admin/checkout" element={<CheckoutConfigPage />} />
          <Route path="/admin/plans" element={<PlanConfigPage />} />
          <Route path="/admin/email" element={<EmailConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </HashRouter>
  );
};

export default App;
