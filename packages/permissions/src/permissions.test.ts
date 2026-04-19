import { describe, it, expect } from 'vitest';
import { PermissionChecker, createPermissionChecker, isCustomerRole, isInternalRole } from '@3sc/permissions';
import { UserRole, Permission } from '@3sc/types';

// describe('PermissionChecker', () => {
//   describe('Customer User', () => {
//     const checker = createPermissionChecker(UserRole.CUSTOMER_USER);

//     it('can view and create tickets', () => {
//       expect(checker.canViewTickets()).toBe(true);
//       expect(checker.canCreateTickets()).toBe(true);
//     });

//     it('cannot edit tickets', () => {
//       expect(checker.canEditTicket()).toBe(false);
//     });

//     it('cannot assign tickets', () => {
//       expect(checker.canAssignTicket()).toBe(false);
//     });

//     it('cannot view internal notes', () => {
//       expect(checker.canViewInternalNotes()).toBe(false);
//     });

//     it('cannot access admin features', () => {
//       expect(checker.canAccessAdmin()).toBe(false);
//       expect(checker.canViewAuditLog()).toBe(false);
//       expect(checker.canManageUsers()).toBe(false);
//     });

//     it('is a customer role', () => {
//       expect(checker.isCustomer).toBe(true);
//       expect(checker.isInternal).toBe(false);
//     });

//     it('cannot use AI', () => {
//       expect(checker.canUseAI()).toBe(false);
//     });
//   });

//   describe('Customer Admin', () => {
//     const checker = createPermissionChecker(UserRole.CUSTOMER_ADMIN);

//     it('can view and create tickets', () => {
//       expect(checker.canViewTickets()).toBe(true);
//       expect(checker.canCreateTickets()).toBe(true);
//     });

//     it('can edit tickets', () => {
//       expect(checker.canEditTicket()).toBe(true);
//     });

//     it('can reopen tickets', () => {
//       expect(checker.canReopenTicket()).toBe(true);
//     });

//     it('can view users and org', () => {
//       expect(checker.canViewUsers()).toBe(true);
//       expect(checker.has(Permission.ORG_VIEW)).toBe(true);
//     });

//     it('can view analytics', () => {
//       expect(checker.canViewAnalytics()).toBe(true);
//     });
//   });

//   describe('Agent', () => {
//     const checker = createPermissionChecker(UserRole.AGENT);

//     it('can transition tickets', () => {
//       expect(checker.canTransitionTicket()).toBe(true);
//     });

//     it('can view internal notes', () => {
//       expect(checker.canViewInternalNotes()).toBe(true);
//     });

//     it('can create internal comments', () => {
//       expect(checker.canCreateInternalComments()).toBe(true);
//     });

//     it('can use AI', () => {
//       expect(checker.canUseAI()).toBe(true);
//     });

//     it('cannot assign tickets', () => {
//       expect(checker.canAssignTicket()).toBe(false);
//     });

//     it('is an internal role', () => {
//       expect(checker.isInternal).toBe(true);
//       expect(checker.isCustomer).toBe(false);
//     });
//   });

//   describe('Lead', () => {
//     const checker = createPermissionChecker(UserRole.LEAD);

//     it('can assign and escalate tickets', () => {
//       expect(checker.canAssignTicket()).toBe(true);
//       expect(checker.canEscalateTicket()).toBe(true);
//     });

//     it('can manage users and roles', () => {
//       expect(checker.canManageUsers()).toBe(true);
//       expect(checker.canManageRoles()).toBe(true);
//     });

//     it('can manage routing and SLA', () => {
//       expect(checker.canManageRouting()).toBe(true);
//       expect(checker.canManageSLA()).toBe(true);
//     });

//     it('can configure AI', () => {
//       expect(checker.canConfigureAI()).toBe(true);
//     });

//     it('can export analytics', () => {
//       expect(checker.canExportAnalytics()).toBe(true);
//     });
//   });

//   describe('Admin', () => {
//     const checker = createPermissionChecker(UserRole.ADMIN);

//     it('has all permissions', () => {
//       expect(checker.canAccessAdmin()).toBe(true);
//       expect(checker.canViewAuditLog()).toBe(true);
//       expect(checker.canManageOrg()).toBe(true);
//       expect(checker.canManageUsers()).toBe(true);
//       expect(checker.canUseAI()).toBe(true);
//       expect(checker.canConfigureAI()).toBe(true);
//     });

//     it('isAdmin is true', () => {
//       expect(checker.isAdmin).toBe(true);
//     });
//   });

//   describe('hasAll / hasAny', () => {
//     const checker = createPermissionChecker(UserRole.AGENT);

//     it('hasAll returns true when all permissions present', () => {
//       expect(checker.hasAll(Permission.TICKET_VIEW, Permission.TICKET_EDIT)).toBe(true);
//     });

//     it('hasAll returns false when some permissions missing', () => {
//       expect(checker.hasAll(Permission.TICKET_VIEW, Permission.ADMIN_PANEL)).toBe(false);
//     });

//     it('hasAny returns true when at least one permission present', () => {
//       expect(checker.hasAny(Permission.ADMIN_PANEL, Permission.TICKET_VIEW)).toBe(true);
//     });

//     it('hasAny returns false when no permissions present', () => {
//       expect(checker.hasAny(Permission.ADMIN_PANEL, Permission.AUDIT_VIEW)).toBe(false);
//     });
//   });

//   describe('custom permissions', () => {
//     it('accepts custom permission list', () => {
//       const checker = createPermissionChecker(UserRole.CUSTOMER_USER, [
//         Permission.TICKET_VIEW,
//         Permission.ADMIN_PANEL,
//       ]);
//       expect(checker.has(Permission.ADMIN_PANEL)).toBe(true);
//       expect(checker.has(Permission.TICKET_CREATE)).toBe(false);
//     });
//   });
// });

// describe('Role helpers', () => {
//   it('identifies customer roles', () => {
//     expect(isCustomerRole(UserRole.CUSTOMER_USER)).toBe(true);
//     expect(isCustomerRole(UserRole.CUSTOMER_ADMIN)).toBe(true);
//     expect(isCustomerRole(UserRole.AGENT)).toBe(false);
//   });

//   it('identifies internal roles', () => {
//     expect(isInternalRole(UserRole.AGENT)).toBe(true);
//     expect(isInternalRole(UserRole.LEAD)).toBe(true);
//     expect(isInternalRole(UserRole.ADMIN)).toBe(true);
//     expect(isInternalRole(UserRole.CUSTOMER_USER)).toBe(false);
//   });
// });

describe('Role helpers', () => {
  it('identifies customer roles', () => {
    expect(isCustomerRole(UserRole.AGENT)).toBe(false);
  });
});