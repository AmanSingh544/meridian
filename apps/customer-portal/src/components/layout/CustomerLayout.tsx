import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSession, usePermissions, useIsMobile } from '@3sc/hooks';
import { Avatar, ThemeToggle } from '@3sc/ui';
import { logout } from '../../features/auth/authSlice';
import type { AppDispatch, RootState } from '../../store';
import { Permission } from '@3sc/types';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', perm: null },
  // CLIENT_USER sees TICKET_VIEW_OWN; CLIENT_ADMIN sees TICKET_VIEW_ORG — both grant access
  { path: '/tickets', label: 'Tickets', icon: '🎫', perm: Permission.TICKET_VIEW_OWN },
  { path: '/knowledge', label: 'Knowledge Base', icon: '📚', perm: Permission.KB_VIEW },
  { path: '/projects', label: 'Projects', icon: '📁', perm: Permission.PROJECT_VIEW },
  { path: '/notifications', label: 'Notifications', icon: '🔔', perm: null },
  // REPORT_VIEW replaces old ANALYTICS_VIEW — CLIENT_ADMIN only
  { path: '/analytics', label: 'Analytics', icon: '📈', perm: Permission.REPORT_VIEW },
  // MEMBER_VIEW replaces old USER_VIEW — all client roles have this
  { path: '/team', label: 'Team', icon: '👥', perm: Permission.MEMBER_VIEW },
  // WORKSPACE_CONFIGURE replaces old ORG_VIEW — CLIENT_ADMIN only
  { path: '/organization', label: 'Organization', icon: '🏢', perm: Permission.WORKSPACE_CONFIGURE },
  // AUDIT_VIEW — ADMIN only, not visible on customer portal
  { path: '/audit', label: 'Audit Log', icon: '📋', perm: Permission.AUDIT_VIEW },
];

export const CustomerLayout: React.FC = () => {
  const session = useSession();
  const permissions = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--color-brand-700)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-brand-50)' : 'transparent',
    textDecoration: 'none',
    transition: 'var(--transition-fast)',
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside style={{
          width: '16rem',
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 1030,
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{
            padding: '0.54rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <svg width="32" height="32" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="56" height="56" rx="8" fill="#4f46e5"/>
              <path d="M 28 10 L 34 24 L 28 28 L 22 24 Z" fill="#ffffff" opacity="0.95"/>
              <path d="M 46 28 L 34 32 L 30 28 L 34 24 Z" fill="#c7d2fe" opacity="0.9"/>
              <path d="M 28 46 L 22 32 L 28 28 L 34 32 Z" fill="#e0e7ff" opacity="0.8"/>
              <path d="M 10 28 L 22 24 L 26 28 L 22 32 Z" fill="#e0e7ff" opacity="0.65"/>
              <circle cx="28" cy="28" r="2.5" fill="#ffffff"/>
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                Meridian
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                {session?.tenantName || 'Support Portal'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {NAV_ITEMS.map((item) => {
              // Tickets nav: visible if user has either TICKET_VIEW_OWN or TICKET_VIEW_ORG
              if (item.path === '/tickets') {
                if (!permissions.hasAny(Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG)) return null;
              } else if (item.perm && !permissions.has(item.perm)) return null;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  style={({ isActive }) => navItemStyle(isActive)}
                >
                  <span style={{ fontSize: '1.125rem', width: '1.5rem', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* User Section */}
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <Avatar name={session?.displayName || 'User'} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.8125rem', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {session?.displayName}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                {session?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1rem', color: 'var(--color-text-muted)',
                padding: '0.25rem',
              }}
            >
              ↪
            </button>
          </div>
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 1029,
          }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: '3.5rem',
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 1020,
        }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.25rem', color: 'var(--color-text)',
              }}
            >
              ☰
            </button>
          )}
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <NavLink
            to="/notifications"
            style={{
              position: 'relative', textDecoration: 'none',
              fontSize: '1.25rem', color: 'var(--color-text-secondary)',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: 'var(--color-danger)', color: '#fff',
                fontSize: '0.5625rem', fontWeight: 700,
                width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: '80rem', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
