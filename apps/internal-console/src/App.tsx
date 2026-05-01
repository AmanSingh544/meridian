import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store, type AppDispatch } from './store';
import { ErrorBoundary, ToastProvider } from '@3sc/ui';
import { Permission } from '@3sc/types';
import { checkSession } from './features/auth/authSlice';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ConsoleLayout } from './components/layout/ConsoleLayout';
import { applyAccentColor, applyDensity } from '@3sc/hooks';
// import '@3sc/ui/src/styles/global.css';
import '../../../packages/ui/src/styles/global.css';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const AgentDashboardPage = lazy(() => import('./pages/AgentDashboardPage').then(m => ({ default: m.AgentDashboardPage })));
const TicketQueuePage = lazy(() => import('./pages/TicketQueuePage').then(m => ({ default: m.TicketQueuePage })));
const TriagePage = lazy(() => import('./pages/TriagePage').then(m => ({ default: m.TriagePage })));
const TicketWorkspacePage = lazy(() => import('./pages/TicketWorkspacePage').then(m => ({ default: m.TicketWorkspacePage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage').then(m => ({ default: m.OrganizationsPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const KBArticleEditorPage = lazy(() => import('./pages/KBArticleEditorPage').then(m => ({ default: m.KBArticleEditorPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const EscalationsPage = lazy(() => import('./pages/EscalationsPage').then(m => ({ default: m.EscalationsPage })));
const SLAConfigPage = lazy(() => import('./pages/SLAConfigPage').then(m => ({ default: m.SLAConfigPage })));
const SystemSettingsPage = lazy(() => import('./pages/SystemSettingsPage').then(m => ({ default: m.SystemSettingsPage })));
const RoutingRulesPage = lazy(() => import('./pages/RoutingRulesPage').then(m => ({ default: m.RoutingRulesPage })));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage').then(m => ({ default: m.UserSettingsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const DeliveryBoardPage = lazy(() => import('./pages/DeliveryBoardPage'));
const OnboardingListPage = lazy(() => import('./pages/OnboardingListPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const CsatDashboardPage = lazy(() => import('./pages/CsatDashboardPage').then(m => ({ default: m.CsatDashboardPage })));

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
  useEffect(() => {
    const tenantId = sessionStorage.getItem('tenant_id');
    const userId = sessionStorage.getItem('user_id');
    if (tenantId) dispatch(checkSession(tenantId));
    else dispatch({ type: 'auth/checkSession/rejected' });
  }, [dispatch]);

  // Apply persisted appearance preferences immediately on mount
  useEffect(() => {
    const accent = localStorage.getItem('3sc_pref_accent');
    const density = localStorage.getItem('3sc_pref_density') as 'comfortable' | 'compact' | null;
    if (accent) applyAccentColor(accent);
    if (density) applyDensity(density);
  }, []);

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={
        <ProtectedRoute>
          <ConsoleLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<AgentDashboardPage />} />
        <Route path="/tickets" element={<TicketQueuePage />} />
        {/* Triage — TICKET_ASSIGN is LEAD and ADMIN only */}
        <Route path="/tickets/triage" element={
          <ProtectedRoute permission={Permission.TICKET_ASSIGN}>
            <TriagePage />
          </ProtectedRoute>
        } />
        <Route path="/tickets/:id" element={<TicketWorkspacePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Permission-gated internal routes */}
        <Route path="/analytics" element={
          <ProtectedRoute permission={Permission.REPORT_VIEW}>
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="/csat" element={
          <ProtectedRoute permission={Permission.REPORT_VIEW}>
            <CsatDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute permission={Permission.MEMBER_VIEW}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/organizations" element={
          <ProtectedRoute permission={Permission.MEMBER_MANAGE}>
            <OrganizationsPage />
          </ProtectedRoute>
        } />
        <Route path="/escalations" element={
          <ProtectedRoute permission={Permission.ESCALATION_VIEW}>
            <EscalationsPage />
          </ProtectedRoute>
        } />
        <Route path="/routing" element={
          <ProtectedRoute permission={Permission.ROUTING_VIEW}>
            <RoutingRulesPage />
          </ProtectedRoute>
        } />
        <Route path="/sla-config" element={
          <ProtectedRoute permission={Permission.SLA_CONFIGURE}>
            <SLAConfigPage />
          </ProtectedRoute>
        } />
        <Route path="/system-settings" element={
          <ProtectedRoute permission={Permission.SYSTEM_CONFIGURE}>
            <SystemSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute permission={Permission.AUDIT_VIEW}>
            <AuditLogPage />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute permission={Permission.PROJECT_VIEW}>
            <ProjectsPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:id" element={
          <ProtectedRoute permission={Permission.PROJECT_VIEW}>
            <ProjectDetailPage />
          </ProtectedRoute>
        } />

        <Route path="/delivery" element={
          <ProtectedRoute permission={Permission.DELIVERY_VIEW}>
            <DeliveryBoardPage />
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute permission={Permission.ONBOARDING_VIEW}>
            <OnboardingListPage />
          </ProtectedRoute>
        } />

        {/* User account settings — accessible to all authenticated agents */}
        <Route path="/settings" element={<UserSettingsPage />} />

        <Route path="/knowledge" element={
          <ProtectedRoute permission={Permission.KB_VIEW}>
            <KnowledgeBasePage />
          </ProtectedRoute>
        } />
        <Route path="/knowledge/new" element={
          <ProtectedRoute permission={Permission.KB_MANAGE}>
            <KBArticleEditorPage />
          </ProtectedRoute>
        } />
        <Route path="/knowledge/:id/edit" element={
          <ProtectedRoute permission={Permission.KB_MANAGE}>
            <KBArticleEditorPage />
          </ProtectedRoute>
        } />

        {/* Documents — all authenticated internal users */}
        <Route path="/documents" element={<DocumentsPage />} />
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
