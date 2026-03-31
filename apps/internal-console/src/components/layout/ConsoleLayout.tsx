import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSession, usePermissions, useIsMobile } from '@3sc/hooks';
import { Avatar, ConnectionIndicator, Badge } from '@3sc/ui';
import { Permission } from '@3sc/types';
import { logout } from '../../features/auth/authSlice';
import type { AppDispatch, RootState } from '../../store';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  permission?: Permission;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/tickets', label: 'Ticket Queue', icon: '🎫' },
  { path: '/tickets/triage', label: 'Triage', icon: '🔀', permission: Permission.TICKET_ASSIGN },
  { path: '/search', label: 'Search', icon: '🔍' },
  { path: '/analytics', label: 'Analytics', icon: '📈', permission: Permission.ANALYTICS_VIEW },
  { path: '/users', label: 'Users', icon: '👥', permission: Permission.USER_VIEW, section: 'Admin' },
  { path: '/organizations', label: 'Organizations', icon: '🏢', permission: Permission.ORG_VIEW, section: 'Admin' },
  { path: '/routing', label: 'Routing Rules', icon: '🔧', permission: Permission.ROUTING_MANAGE, section: 'Admin' },
  { path: '/audit', label: 'Audit Log', icon: '📋', permission: Permission.AUDIT_VIEW, section: 'Admin' },
];

export const ConsoleLayout: React.FC = () => {
  const session = useSession();
  const permissions = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const connectionStatus = useSelector((state: RootState) => state.realtime.connectionStatus);
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || permissions.has(item.permission),
  );

  const mainItems = visibleItems.filter((i) => !i.section);
  const adminItems = visibleItems.filter((i) => i.section === 'Admin');

  const navStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.5rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400,
    color: isActive ? '#fff' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-brand-600)' : 'transparent',
    textDecoration: 'none',
    transition: 'var(--transition-fast)',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside style={{
          width: '15rem',
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0, height: '100vh', zIndex: 1030, flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{
            padding: '1rem', borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: '#1e1b4b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c7d2fe', fontWeight: 700, fontSize: '0.6875rem',
              fontFamily: 'var(--font-display)',
            }}>3SC</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'var(--font-display)' }}>
                Internal Console
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '0.5rem 0.625rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {mainItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  style={({ isActive }) => navStyle(isActive)}
                >
                  <span style={{ fontSize: '1rem', width: '1.25rem', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {adminItems.length > 0 && (
              <>
                <div style={{
                  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-text-muted)',
                  padding: '1rem 0.875rem 0.375rem',
                }}>
                  Administration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  {adminItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      style={({ isActive }) => navStyle(isActive)}
                    >
                      <span style={{ fontSize: '1rem', width: '1.25rem', textAlign: 'center' }}>{item.icon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Connection + User */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ marginBottom: '0.75rem', paddingLeft: '0.375rem' }}>
              <ConnectionIndicator status={connectionStatus} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.5rem 0.375rem',
            }}>
              <Avatar name={session?.displayName || 'Agent'} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session?.displayName}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {session?.role.replace('_', ' ')}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: '0.875rem',
                }}
              >↪</button>
            </div>
          </div>
        </aside>
      )}

      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1029 }}
        />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: '3.25rem', background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center',
          padding: '0 1.25rem', gap: '0.75rem',
          position: 'sticky', top: 0, zIndex: 1020,
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.125rem', color: 'var(--color-text)',
            }}>☰</button>
          )}
          <div style={{ flex: 1 }} />
          <NavLink
            to="/notifications"
            style={{
              position: 'relative', textDecoration: 'none',
              fontSize: '1.125rem', color: 'var(--color-text-secondary)',
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

        <main style={{ flex: 1, padding: '1.25rem', maxWidth: '90rem', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
