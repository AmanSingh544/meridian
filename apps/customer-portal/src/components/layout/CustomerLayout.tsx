import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useSession, usePermissions, useIsMobile } from '@3sc/hooks';
import { Avatar } from '@3sc/ui';
import { logout } from '../../features/auth/authSlice';
import type { AppDispatch } from '../../store';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', perm: null },
  { path: '/tickets', label: 'Tickets', icon: '🎫', perm: null },
  { path: '/communication', label: 'Messages', icon: '💬', perm: null },
  { path: '/knowledge', label: 'Knowledge Base', icon: '📚', perm: null },
  { path: '/projects', label: 'Projects', icon: '📁', perm: 'project:view' },
  { path: '/notifications', label: 'Notifications', icon: '🔔', perm: null },
];

export const CustomerLayout: React.FC = () => {
  const session = useSession();
  const permissions = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

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
            padding: '1.25rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'var(--color-brand-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              fontFamily: 'var(--font-display)',
            }}>
              3SC
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                Support Portal
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                {session?.tenantName || 'Customer'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {NAV_ITEMS.map((item) => {
              if (item.perm && !permissions.has(item.perm as never)) return null;
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
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {session?.tenantName}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: '80rem', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
