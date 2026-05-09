import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSession, usePermissions, useIsMobile } from '@3sc/hooks';
import { useGetNotificationsQuery } from '@3sc/api';
import { Avatar, ThemeToggle, Icon, IconButton, Tooltip } from '@3sc/ui';
import { CopilotWidget } from '../../features/copilot/CopilotWidget';
import { logout } from '../../features/auth/authSlice';
import { setUnreadCount } from '../../features/notifications/notificationsSlice';
import type { AppDispatch, RootState } from '../../store';
import { Permission } from '@3sc/types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  FolderOpen,
  Plane,
  Map,
  Bell,
  BarChart3,
  Users,
  Building2,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  perm: Permission | null;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  // CLIENT_USER sees TICKET_VIEW_OWN; CLIENT_ADMIN sees TICKET_VIEW_ORG — both grant access
  { path: '/tickets', label: 'Tickets', icon: Ticket, perm: Permission.TICKET_VIEW_OWN },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen, perm: Permission.KB_VIEW },
  { path: '/documents', label: 'Documents', icon: FolderOpen, perm: Permission.DOCUMENT_VIEW },
  { path: '/projects', label: 'Projects', icon: FolderOpen, perm: Permission.PROJECT_VIEW },
  { path: '/onboarding', label: 'Onboarding', icon: Plane, perm: null },
  { path: '/roadmap', label: 'Roadmap', icon: Map, perm: Permission.ROADMAP_VOTE },
  { path: '/notifications', label: 'Notifications', icon: Bell, perm: null },
  // REPORT_VIEW replaces old ANALYTICS_VIEW — CLIENT_ADMIN only
  { path: '/analytics', label: 'Analytics', icon: BarChart3, perm: Permission.REPORT_VIEW },
  // MEMBER_VIEW replaces old USER_VIEW — all client roles have this
  { path: '/team', label: 'Team', icon: Users, perm: Permission.MEMBER_VIEW },
  // WORKSPACE_CONFIGURE replaces old ORG_VIEW — CLIENT_ADMIN only
  { path: '/organization', label: 'Organization', icon: Building2, perm: Permission.WORKSPACE_CONFIGURE },
  // AUDIT_VIEW — ADMIN only, not visible on customer portal
  { path: '/audit', label: 'Audit Log', icon: ClipboardList, perm: Permission.AUDIT_VIEW },
];

export const CustomerLayout: React.FC = () => {
  const session = useSession();
  const permissions = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

  const { data: notifMeta } = useGetNotificationsQuery({ limit: 1, unreadOnly: true });
  useEffect(() => {
    if (notifMeta?.unreadCount !== undefined) {
      dispatch(setUnreadCount(notifMeta.unreadCount));
    }
  }, [notifMeta?.unreadCount, dispatch]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const navItemStyle = (isActive: boolean, isHovered: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
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
      transition: 'background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 180ms cubic-bezier(0.4,0,0.2,1)',
      cursor: 'pointer',
      position: 'relative',
    };
    if (isHovered && !isActive) {
      base.background = 'var(--color-bg-muted)';
      base.color = 'var(--color-text)';
      base.boxShadow = 'var(--shadow-sm)';
    }
    return base;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside
          style={{
            width: '16rem',
            background: 'var(--color-bg)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'fixed' : 'static',
            top: 0,
            left: 0,
            height: '100vh',
            zIndex: 1030,
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {/* Logo */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexShrink: 0,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="56" height="56" rx="8" fill="#4f46e5" />
              <path d="M 28 10 L 34 24 L 28 28 L 22 24 Z" fill="#ffffff" opacity="0.95" />
              <path d="M 46 28 L 34 32 L 30 28 L 34 24 Z" fill="#c7d2fe" opacity="0.9" />
              <path d="M 28 46 L 22 32 L 28 28 L 34 32 Z" fill="#e0e7ff" opacity="0.8" />
              <path d="M 10 28 L 22 24 L 26 28 L 22 32 Z" fill="#e0e7ff" opacity="0.65" />
              <circle cx="28" cy="28" r="2.5" fill="#ffffff" />
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
              if (item.path === '/tickets') {
                if (!permissions.hasAny(Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG)) return null;
              } else if (item.perm && !permissions.has(item.perm)) return null;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  onMouseEnter={() => setHoveredPath(item.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={({ isActive }) => navItemStyle(isActive, hoveredPath === item.path)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3,
                            height: '1.25rem',
                            background: 'var(--color-brand-500)',
                            borderRadius: '0 4px 4px 0',
                          }}
                        />
                      )}
                      <span style={{ width: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Icon icon={item.icon} size="md" />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User Section */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderTop: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            {/* Settings link */}
            <NavLink
              to="/settings"
              onClick={() => isMobile && setSidebarOpen(false)}
              onMouseEnter={() => setHoveredPath('/settings-bottom')}
              onMouseLeave={() => setHoveredPath(null)}
              style={({ isActive }) => {
                const isHovered = hoveredPath === '/settings-bottom';
                return {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.5rem 0.625rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-brand-700)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-brand-50)' : isHovered ? 'var(--color-bg-muted)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: '0.5rem',
                  transition: 'background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), box-shadow 180ms cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: isHovered && !isActive ? 'var(--shadow-sm)' : undefined,
                };
              }}
            >
              <span style={{ width: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icon icon={Settings} size="sm" />
              </span>
              Account Settings
            </NavLink>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0.625rem' }}>
              <Link to="/settings" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <Avatar name={session?.displayName || 'User'} size={30} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--color-text)',
                  }}
                >
                  {session?.displayName}
                </div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session?.email}
                </div>
              </div>
              <Tooltip content="Sign out" position="top">
                <IconButton icon={LogOut} size="sm" label="Sign out" onClick={handleLogout} />
              </Tooltip>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 1029,
          }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header
          style={{
            height: '3.5rem',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            gap: '1rem',
            flexShrink: 0,
            zIndex: 1020,
          }}
        >
          {isMobile && (
            <Tooltip content="Menu" position="bottom">
              <IconButton
                icon={Menu}
                size="md"
                label="Toggle menu"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              />
            </Tooltip>
          )}
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <Tooltip content="Notifications" position="bottom">
            <NavLink
              to="/notifications"
              style={{
                position: 'relative',
                textDecoration: 'none',
                color: 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                transition: 'background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), border-color 180ms cubic-bezier(0.4,0,0.2,1), box-shadow 180ms cubic-bezier(0.4,0,0.2,1), transform 120ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {({ isActive }) => (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--color-bg-muted)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget.parentElement as HTMLElement;
                    if (el) {
                      el.style.background = 'var(--color-bg-muted)';
                      el.style.color = 'var(--color-text)';
                      el.style.borderColor = 'var(--color-border)';
                      el.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget.parentElement as HTMLElement;
                    if (el && !isActive) {
                      el.style.background = 'transparent';
                      el.style.color = 'var(--color-text-secondary)';
                      el.style.borderColor = 'transparent';
                      el.style.boxShadow = 'none';
                    }
                  }}
                  onMouseDown={(e) => {
                    const el = e.currentTarget.parentElement as HTMLElement;
                    if (el) el.style.transform = 'scale(0.92)';
                  }}
                  onMouseUp={(e) => {
                    const el = e.currentTarget.parentElement as HTMLElement;
                    if (el) el.style.transform = 'scale(1)';
                  }}
                >
                  <Icon icon={Bell} size="lg" />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'var(--color-danger)',
                        color: '#fff',
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          </Tooltip>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: '1.5rem',
            maxWidth: '95rem',
            width: '100%',
            margin: '0 auto',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
      <CopilotWidget />
    </div>
  );
};
