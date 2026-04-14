import React, { useState } from 'react';
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation, useInviteUserMutation } from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, usePermissions } from '@3sc/hooks';
import {
  DataTable, SearchInput, Select, Avatar, Badge, Pagination,
  Button, EmptyState, Modal, Input, PermissionGate,
} from '@3sc/ui';
import { Permission, UserRole } from '@3sc/types';
import type { User } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

const ROLE_COLORS: Record<string, string> = {
  ADMIN:        '#ef4444',
  LEAD:         '#8b5cf6',
  AGENT:        '#3b82f6',
  CLIENT_ADMIN: '#f59e0b',
  CLIENT_USER:  '#6b7280',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:        'Admin',
  LEAD:         'Lead',
  AGENT:        'Agent',
  CLIENT_ADMIN: 'Client Admin',
  CLIENT_USER:  'Client User',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export const UsersPage: React.FC = () => {
  useDocumentTitle('Users');
  const permissions = usePermissions();

  // ── Filters ────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]             = useState(1);
  const debouncedSearch             = useDebouncedValue(search, 300);

  const { data, isLoading, refetch } = useGetUsersQuery({
    page,
    role:   roleFilter      || undefined,
    search: debouncedSearch || undefined,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const [updateUser,  { isLoading: saving   }] = useUpdateUserMutation();
  const [deleteUser,  { isLoading: deleting }] = useDeleteUserMutation();
  const [inviteUser,  { isLoading: inviting }] = useInviteUserMutation();

  // ── Edit modal state ───────────────────────────────────────────
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [editRole,   setEditRole]   = useState<UserRole>(UserRole.AGENT);
  const [editActive, setEditActive] = useState(true);

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditActive(user.isActive);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    await updateUser({ id: editUser.id, payload: { role: editRole, isActive: editActive } }).unwrap();
    setEditUser(null);
    refetch();
  };

  // ── Invite modal state ─────────────────────────────────────────
  const [showInvite,  setShowInvite]  = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<UserRole>(UserRole.AGENT);
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast,  setInviteLast]  = useState('');

  const handleInvite = async () => {
    await inviteUser({
      email:     inviteEmail.trim(),
      role:      inviteRole,
      firstName: inviteFirst.trim(),
      lastName:  inviteLast.trim(),
    }).unwrap();
    setShowInvite(false);
    setInviteEmail('');
    setInviteFirst('');
    setInviteLast('');
    setInviteRole(UserRole.AGENT);
    refetch();
  };

  // ── Toggle active state ────────────────────────────────────────
  const handleToggleActive = async (user: User) => {
    await updateUser({ id: user.id, payload: { isActive: !user.isActive } }).unwrap();
    refetch();
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns = [
    {
      key: 'name', header: 'User', width: '18rem',
      render: (u: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{u.displayName}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role', width: '9rem',
      render: (u: User) => (
        <Badge
          color={ROLE_COLORS[u.role] || '#6b7280'}
          bgColor={`${ROLE_COLORS[u.role] || '#6b7280'}22`}
        >
          {ROLE_LABELS[u.role] || u.role}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Status', width: '6rem',
      render: (u: User) => (
        <Badge
          color={u.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={u.isActive ? '#dcfce7' : '#f3f4f6'}
        >
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Login', width: '11rem',
      render: (u: User) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', width: '9rem',
      render: (u: User) => (
        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(u); }}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleToggleActive(u); }}
              loading={deleting}
              style={{ color: u.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {u.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Users
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {data?.total ?? 0} total users
          </p>
        </div>
        <PermissionGate permission={Permission.MEMBER_INVITE}>
          <Button icon={<span>+</span>} onClick={() => setShowInvite(true)}>
            Add User
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        </div>
        <div style={{ width: '10rem' }}>
          <Select
            options={[{ value: '', label: 'All Roles' }, ...ROLE_OPTIONS]}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        emptyMessage="No users found"
      />

      {data && (
        <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />
      )}

      {/* ── Edit User Modal ──────────────────────────────────────── */}
      {editUser && (
        <Modal isOpen onClose={() => setEditUser(null)} title={`Edit User — ${editUser.displayName}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {editUser.email}
            </div>
            <Select
              label="Role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              options={ROLE_OPTIONS}
            />
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

      {/* ── Invite / Add User Modal ──────────────────────────────── */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Add New User">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="First Name"
              value={inviteFirst}
              onChange={(e) => setInviteFirst(e.target.value)}
              placeholder="Jane"
              autoFocus
            />
            <Input
              label="Last Name"
              value={inviteLast}
              onChange={(e) => setInviteLast(e.target.value)}
              placeholder="Smith"
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="jane.smith@3sc.com"
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
          <div style={{
            padding: '0.75rem', background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-muted)',
          }}>
            An invitation email will be sent to this address with login instructions.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              loading={inviting}
              disabled={!inviteEmail.trim() || !inviteFirst.trim() || !inviteLast.trim()}
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
