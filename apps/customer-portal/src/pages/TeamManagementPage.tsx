import React, { useState } from 'react';
import { useGetUsersQuery, useUpdateUserMutation, useInviteUserMutation } from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import {
  Card, Button, Badge, Avatar, Skeleton, EmptyState, ErrorState,
  SearchInput, Modal, Input, Select, PermissionGate,
} from '@3sc/ui';
import { Permission, UserRole } from '@3sc/types';
import type { User } from '@3sc/types';


const roleBadgeColor: Record<UserRole, { color: string; bg: string }> = {
  [UserRole.ADMIN]: { color: '#7c3aed', bg: '#ede9fe' },
  [UserRole.LEAD]: { color: '#1d4ed8', bg: '#dbeafe' },
  [UserRole.AGENT]: { color: '#0369a1', bg: '#e0f2fe' },
  [UserRole.CLIENT_ADMIN]: { color: '#b45309', bg: '#fef3c7' },
  [UserRole.CLIENT_USER]: { color: '#374151', bg: '#f3f4f6' },
};

const roleLabel: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.LEAD]: 'Lead',
  [UserRole.AGENT]: 'Agent',
  [UserRole.CLIENT_ADMIN]: 'Client Admin',
  [UserRole.CLIENT_USER]: 'Client User',
};

// ── Mock data — replace with live API when ready ──────────────────
const usersMock = {
  data: [
    {
      id: 'u001',
      email: 'alice@acme.com',
      displayName: 'Alice Johnson',
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.CLIENT_ADMIN,
      permissions: [],
      organizationId: 'org001',
      isActive: true,
      lastLoginAt: '2026-04-12T10:00:00Z',
      createdAt: '2025-01-10T08:00:00Z',
      updatedAt: '2026-04-12T10:00:00Z',
    },
    {
      id: 'u002',
      email: 'bob@acme.com',
      displayName: 'Bob Smith',
      firstName: 'Bob',
      lastName: 'Smith',
      role: UserRole.CLIENT_USER,
      permissions: [],
      organizationId: 'org001',
      isActive: true,
      lastLoginAt: '2026-04-11T14:30:00Z',
      createdAt: '2025-03-05T09:00:00Z',
      updatedAt: '2026-04-11T14:30:00Z',
    },
    {
      id: 'u003',
      email: 'carol@acme.com',
      displayName: 'Carol White',
      firstName: 'Carol',
      lastName: 'White',
      role: UserRole.CLIENT_USER,
      permissions: [],
      organizationId: 'org001',
      isActive: false,
      lastLoginAt: '2026-03-20T11:00:00Z',
      createdAt: '2025-06-18T10:00:00Z',
      updatedAt: '2026-03-20T11:00:00Z',
    },
    {
      id: 'u004',
      email: 'dan@acme.com',
      displayName: 'Dan Lee',
      firstName: 'Dan',
      lastName: 'Lee',
      role: UserRole.CLIENT_USER,
      permissions: [],
      organizationId: 'org001',
      isActive: true,
      lastLoginAt: '2026-04-10T08:15:00Z',
      createdAt: '2025-09-01T07:00:00Z',
      updatedAt: '2026-04-10T08:15:00Z',
    },
  ],
  total: 4,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

export const TeamManagementPage: React.FC = () => {
  useDocumentTitle('Team Management');
  const permissions = usePermissions();

    // Live query — commented out until API is ready
  // const { data, isLoading, error, refetch } = useGetUsersQuery({ page: 1 });
  const { data, isLoading, error, refetch } = { data: usersMock, isLoading: false, error: null, refetch: () => {} };

  // const { data, isLoading, error, refetch } = useGetUsersQuery({ page: 1 });

  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [inviteUser, { isLoading: inviting }] = useInviteUserMutation();

  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>(UserRole.CLIENT_USER);
  const [editActive, setEditActive] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.CLIENT_USER);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const filtered = (data?.data ?? []).filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditActive(user.isActive);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      await updateUser({ id: editUser.id, payload: { role: editRole, isActive: editActive } }).unwrap();
      setEditUser(null);
    } catch {
      // handled by RTK Query
    }
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteRole(UserRole.CLIENT_USER);
    setInviteError(null);
    setInviteSuccess(false);
  };

  const handleSendInvite = async () => {
    setInviteError(null);
    try {
      await inviteUser({
        email: inviteEmail.trim(),
        role: inviteRole,
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
      }).unwrap();
      setInviteSuccess(true);
      setTimeout(resetInviteModal, 1800);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'Failed to send invitation. Please try again.';
      setInviteError(message);
    }
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Team Management
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Manage team members and their roles
          </p>
        </div>
        <PermissionGate permission={Permission.MEMBER_INVITE}>
          <Button onClick={() => setShowInviteModal(true)} icon={<span>+</span>}>
            Invite Member
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
        />
      </div>

      {/* Users List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="4.5rem" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No team members found" description="Try adjusting your search." />
      ) : (
        <Card padding="0">
          {filtered.map((user, idx) => {
            const rb = roleBadgeColor[user.role] ?? { color: '#374151', bg: '#f3f4f6' };
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <Avatar name={user.displayName} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.displayName}</span>
                    <Badge color={rb.color} bgColor={rb.bg}>{roleLabel[user.role]}</Badge>
                    {!user.isActive && (
                      <Badge color="#6b7280" bgColor="#f3f4f6">Inactive</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                    {user.email}
                  </div>
                </div>
                <PermissionGate permission={Permission.MEMBER_MANAGE}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(user as User)}>
                    Edit
                  </Button>
                </PermissionGate>
              </div>
            );
          })}
        </Card>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Edit: ${editUser.displayName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {editUser.email}
            </div>
            <PermissionGate permission={Permission.MEMBER_MANAGE}>
              <Select
                label="Role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                options={Object.entries(roleLabel).map(([value, label]) => ({ value, label }))}
              />
            </PermissionGate>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Active account
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={saving}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={resetInviteModal}
        title="Invite Team Member"
      >
        {inviteSuccess ? (
          <div style={{
            textAlign: 'center', padding: '1.5rem 0',
            color: 'var(--color-text)', fontSize: '0.9375rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            Invitation sent to <strong>{inviteEmail}</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Input
                label="First Name"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="Jane"
              />
              <Input
                label="Last Name"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              autoFocus
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              options={[
                { value: UserRole.CLIENT_USER, label: 'Client User' },
                { value: UserRole.CLIENT_ADMIN, label: 'Client Admin' },
              ]}
            />
            <div style={{
              padding: '0.75rem', background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-muted)',
            }}>
              An invitation email will be sent. The invitee will set their own password via the link.
            </div>
            {inviteError && (
              <div style={{
                padding: '0.625rem 0.875rem', background: '#fef2f2',
                border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem', color: '#b91c1c',
              }}>
                {inviteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={resetInviteModal}>Cancel</Button>
              <Button
                disabled={!inviteEmail.trim()}
                loading={inviting}
                onClick={handleSendInvite}
              >
                Send Invite
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
