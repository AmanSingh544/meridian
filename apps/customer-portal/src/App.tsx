import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, type AppDispatch, type RootState } from './store';
import { ErrorBoundary, ToastProvider } from '@3sc/ui';
import { checkSession } from './features/auth/authSlice';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { CustomerLayout } from './components/layout/CustomerLayout';
//import '@3sc/ui/src/styles/global.css';
import '../../../packages/ui/src/styles/global.css';
import { Permission } from '@3sc/types';


// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TicketListPage = lazy(() => import('./pages/TicketListPage').then(m => ({ default: m.TicketListPage })));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const CreateTicketPage = lazy(() => import('./pages/CreateTicketPage').then(m => ({ default: m.CreateTicketPage })));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));
const OrganizationSettingsPage = lazy(() => import('./pages/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '40vh', color: 'var(--color-text-muted)', fontSize: '0.875rem',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-brand-500)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem',
      }} />
      Loading...
    </div>
  </div>
);

const SessionInit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((state: RootState) => state.auth.status);

  useEffect(() => {
    const tenantId = sessionStorage.getItem('tenant_id');
    const userId = sessionStorage.getItem('user_id');
    if (tenantId) dispatch(checkSession(tenantId));
    else dispatch({ type: 'auth/checkSession/rejected' });
  }, [dispatch]);

  if (status === 'idle') {
    return <PageLoader />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={
        <ProtectedRoute>
          <CustomerLayout />
        </ProtectedRoute>
      }>
        {/* Accessible to all authenticated users */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/communication" element={<DashboardPage />} />

        {/* Ticket routes — CLIENT_USER has TICKET_VIEW_OWN, CLIENT_ADMIN has TICKET_VIEW_ORG */}
        <Route path="/tickets" element={
          <ProtectedRoute permissions={[Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG]}>
            <TicketListPage />
          </ProtectedRoute>
        } />
        <Route path="/tickets/new" element={
          <ProtectedRoute permission={Permission.TICKET_CREATE}>
            <CreateTicketPage />
          </ProtectedRoute>
        } />
        <Route path="/tickets/:id" element={
          <ProtectedRoute permissions={[Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG]}>
            <TicketDetailPage />
          </ProtectedRoute>
        } />

        {/* Knowledge Base — require KB_VIEW */}
        <Route path="/knowledge" element={
          <ProtectedRoute permission={Permission.KB_VIEW}>
            <KnowledgeBasePage />
          </ProtectedRoute>
        } />
        <Route path="/knowledge/:id" element={
          <ProtectedRoute permission={Permission.KB_VIEW}>
            <KnowledgeBasePage />
          </ProtectedRoute>
        } />

        {/* Projects — accessible to all authenticated client users */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectsPage />} />

        {/* Team Management — require MEMBER_VIEW */}
        <Route path="/team" element={
          <ProtectedRoute permission={Permission.MEMBER_VIEW}>
            <TeamManagementPage />
          </ProtectedRoute>
        } />

        {/* Organization Settings — require WORKSPACE_CONFIGURE */}
        <Route path="/organization" element={
          <ProtectedRoute permission={Permission.WORKSPACE_CONFIGURE}>
            <OrganizationSettingsPage />
          </ProtectedRoute>
        } />

        {/* Analytics — require REPORT_VIEW */}
        <Route path="/analytics" element={
          <ProtectedRoute permission={Permission.REPORT_VIEW}>
            <AnalyticsPage />
          </ProtectedRoute>
        } />

        {/* Audit Log — no client role has AUDIT_VIEW, redirect away */}
        <Route path="/audit" element={<Navigate to="/dashboard" replace />} />
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
