import React from 'react';
import type { Permission } from '@3sc/types';
import { usePermissions } from '@3sc/hooks';

export interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const checker = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = checker.has(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? checker.hasAll(...permissions)
      : checker.hasAny(...permissions);
  } else {
    hasAccess = true;
  }

  return <>{hasAccess ? children : fallback}</>;
};
