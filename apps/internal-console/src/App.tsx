import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store, type AppDispatch } from './store';
import { ErrorBoundary, ToastProvider } from '@3sc/ui';
import { Permission } from '@3sc/types';
import { checkSession } from './features/auth/authSlice';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ConsoleLayout } from './components/layout/ConsoleLayout';
// import '@3sc/ui/src/styles/global.css';
import '../../../packages/ui/src/styles/global.css';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AgentDashboardPage = lazy(() => import('./pages/AgentDashboardPage').then(m => ({ default: m.AgentDashboardPage })));
const TicketQueuePage = lazy(() => import('./pages/TicketQueuePage').then(m => ({ default: m.TicketQueuePage })));
const TicketWorkspacePage = lazy(() => import('./pages/TicketWorkspacePage').then(m => ({ default: m.TicketWorkspacePage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage').then(m => ({ default: m.OrganizationsPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '40vh', color: 'var(--color-text-muted)', fontSize: '0.875rem',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 28, height: 28, border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-brand-500)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem',
      }} />
      Loading...
    </div>
  </div>
);

const SessionInit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => { dispatch(checkSession()); }, [dispatch]);
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={
        <ProtectedRoute>
          <ConsoleLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<AgentDashboardPage />} />
        <Route path="/tickets" element={<TicketQueuePage />} />
        <Route path="/tickets/triage" element={<TicketQueuePage />} />
        <Route path="/tickets/:id" element={<TicketWorkspacePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<AgentDashboardPage />} />

        {/* Permission-gated admin routes */}
        <Route path="/analytics" element={
          <ProtectedRoute permission={Permission.ANALYTICS_VIEW}>
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute permission={Permission.USER_VIEW}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/organizations" element={
          <ProtectedRoute permission={Permission.ORG_VIEW}>
            <OrganizationsPage />
          </ProtectedRoute>
        } />
        <Route path="/routing" element={
          <ProtectedRoute permission={Permission.ROUTING_MANAGE}>
            <AgentDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute permission={Permission.AUDIT_VIEW}>
            <AuditLogPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--color-brand-500)', margin: 0 }}>404</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Page not found</p>
          </div>
        </div>
      } />
    </Routes>
  </Suspense>
);

export const App: React.FC = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <SessionInit>
            <AppRoutes />
          </SessionInit>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </Provider>
);

export default App;
