import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@3sc/hooks';
import type { Permission } from '@3sc/types';
import { usePermissions } from '@3sc/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/login',
}) => {
  const session = useSession();
  const checker = usePermissions();
  const location = useLocation();

  if (!session) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (permission && !checker.has(permission)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', textAlign: 'center', padding: '2rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Access Denied
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? checker.hasAll(...permissions)
      : checker.hasAny(...permissions);

    if (!hasAccess) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', textAlign: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Access Denied</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Insufficient permissions for this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
