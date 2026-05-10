import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSession, usePermissions, useIsMobile } from '@3sc/hooks';
import { useGetNotificationsQuery } from '@3sc/api';
import { Avatar, ConnectionIndicator, Badge, ThemeToggle, Icon, IconButton, Tooltip } from '@3sc/ui';
import { CopilotWidget } from '../../features/copilot/CopilotWidget';
import { Permission } from '@3sc/types';
import { logout } from '../../features/auth/authSlice';
import { setUnreadCount } from '../../features/notifications/notificationsSlice';
import type { AppDispatch, RootState } from '../../store';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  AlertOctagon,
  GitPullRequest,
  Search,
  BarChart3,
  Smile,
  BookOpen,
  Rocket,
  Users,
  Building2,
  Wrench,
  Timer,
  Settings,
  ClipboardList,
  Lock,
  LogOut,
  Menu,
  Bell,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  section?: string;
  /** If true, item shows in nav but is locked (greyed + lock icon, no navigation) */
  lockedPermission?: Permission;
  /** Tooltip shown on hover of locked items */
  lockedTooltip?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ── Main ──────────────────────────────────────────────────────
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tickets', label: 'Ticket Queue', icon: Ticket },
  { path: '/projects', label: 'Projects', icon: FolderOpen, permission: Permission.PROJECT_VIEW },
  { path: '/escalations', label: 'Escalations', icon: AlertOctagon, permission: Permission.ESCALATION_VIEW },
  { path: '/tickets/triage', label: 'Triage', icon: GitPullRequest, permission: Permission.TICKET_ASSIGN },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, permission: Permission.REPORT_VIEW },
  { path: '/csat', label: 'CSAT & NPS', icon: Smile, permission: Permission.REPORT_VIEW },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen, permission: Permission.KB_VIEW },
  { path: '/documents', label: 'Documents', icon: FolderOpen, permission: Permission.DOCUMENT_VIEW },
  { path: '/delivery', label: 'Delivery Board', icon: Rocket, permission: Permission.DELIVERY_VIEW },
  { path: '/onboarding', label: 'Onboarding', icon: Rocket, permission: Permission.ONBOARDING_VIEW },

  // ── Administration ─────────────────────────────────────────────
  { path: '/users', label: 'Users', icon: Users, permission: Permission.MEMBER_VIEW, section: 'Admin' },
  { path: '/organizations', label: 'Organizations', icon: Building2, permission: Permission.MEMBER_MANAGE, section: 'Admin' },
  { path: '/routing', label: 'Routing Rules', icon: Wrench, permission: Permission.ROUTING_VIEW, section: 'Admin' },
  { path: '/sla-config', label: 'SLA Config', icon: Timer, permission: Permission.SLA_CONFIGURE, section: 'Admin' },
  { path: '/system-settings', label: 'System Settings', icon: Settings, permission: Permission.SYSTEM_CONFIGURE, section: 'Admin' },
  { path: '/audit', label: 'Audit Log', icon: ClipboardList, permission: Permission.AUDIT_VIEW, section: 'Admin' },
];

export const ConsoleLayout: React.FC = () => {
  const session = useSession();
  const permissions = usePermissions();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const connectionStatus = useSelector((state: RootState) => state.realtime.connectionStatus);
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

  // Items are visible if: no permission required, OR user has the permission
  // Admin-section items without permission show as locked (visible but not clickable)
  const allAdminItems = NAV_ITEMS.filter((i) => i.section === 'Admin');
  const mainItems = NAV_ITEMS.filter((i) => !i.section && (!i.permission || permissions.has(i.permission)));
  const adminItems = allAdminItems.filter((i) => !i.permission || permissions.has(i.permission));
  // Locked = admin items the user cannot access but should know exist
  const lockedAdminItems = allAdminItems.filter((i) => i.permission && !permissions.has(i.permission));

  const navStyle = (isActive: boolean, isHovered: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0.875rem',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.8125rem',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#fff' : 'var(--color-text-secondary)',
      background: isActive ? 'var(--color-brand-600)' : 'transparent',
      textDecoration: 'none',
      transition: 'background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 180ms cubic-bezier(0.4,0,0.2,1)',
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
            width: '15rem',
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
              padding: '0.499rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="56" height="56" rx="8" fill="#1e1b4b" />
              <path d="M 28 10 L 34 24 L 28 28 L 22 24 Z" fill="#818cf8" opacity="0.95" />
              <path d="M 46 28 L 34 32 L 30 28 L 34 24 Z" fill="#a5b4fc" opacity="0.85" />
              <path d="M 28 46 L 22 32 L 28 28 L 34 32 Z" fill="#c7d2fe" opacity="0.75" />
              <path d="M 10 28 L 22 24 L 26 28 L 22 32 Z" fill="#e0e7ff" opacity="0.65" />
              <circle cx="28" cy="28" r="2.5" fill="#818cf8" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                Meridian
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
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
                  onMouseEnter={() => setHoveredPath(item.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={({ isActive }) => navStyle(isActive, hoveredPath === item.path)}
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
                            height: '1rem',
                            background: '#fff',
                            borderRadius: '0 4px 4px 0',
                            opacity: 0.6,
                          }}
                        />
                      )}
                      <span style={{ width: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Icon icon={item.icon} size="sm" />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {(adminItems.length > 0 || lockedAdminItems.length > 0) && (
              <>
                <div
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    padding: '1rem 0.875rem 0.375rem',
                  }}
                >
                  Administration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  {adminItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      onMouseEnter={() => setHoveredPath(item.path)}
                      onMouseLeave={() => setHoveredPath(null)}
                      style={({ isActive }) => navStyle(isActive, hoveredPath === item.path)}
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
                                height: '1rem',
                                background: '#fff',
                                borderRadius: '0 4px 4px 0',
                                opacity: 0.6,
                              }}
                            />
                          )}
                          <span style={{ width: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Icon icon={item.icon} size="sm" />
                          </span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                  {lockedAdminItems.map((item) => (
                    <div
                      key={item.path}
                      title="Contact your administrator to enable this feature"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                        fontWeight: 400,
                        color: 'var(--color-text-muted)',
                        opacity: 0.55,
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ width: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Icon icon={item.icon} size="sm" />
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <span style={{ opacity: 0.7 }}>
                        <Icon icon={Lock} size="xs" />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Connection + User */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ marginBottom: '0.75rem', paddingLeft: '0.375rem' }}>
              <ConnectionIndicator status={connectionStatus} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.375rem',
              }}
            >
              <Link to="/settings" title="Account settings" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <Avatar name={session?.displayName || 'Agent'} size={28} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session?.displayName}
                  </div>
                </Link>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {session?.role.replace('_', ' ')}
                </div>
              </div>
              <Tooltip content="Sign out" position="top">
                <IconButton icon={LogOut} size="sm" label="Sign out" onClick={handleLogout} />
              </Tooltip>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header
          style={{
            height: '3.25rem',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.25rem',
            gap: '0.75rem',
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
          <Tooltip content="Account settings" position="bottom">
            <NavLink
              to="/settings"
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
                  <Icon icon={Settings} size="md" />
                </span>
              )}
            </NavLink>
          </Tooltip>
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
                  <Icon icon={Bell} size="md" />
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
