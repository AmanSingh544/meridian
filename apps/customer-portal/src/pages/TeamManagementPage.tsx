import React, { useState, useMemo } from 'react';
import {
  useGetTeamMembersQuery,
  useUpdateTeamMemberRoleMutation,
  useToggleTeamMemberPermissionMutation,
  useDeactivateTeamMemberMutation,
  useInviteUserMutation,
  useGetProjectsQuery,
} from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, usePermissions, useSession } from '@3sc/hooks';
import {
  Card, Button, Badge, Avatar, Skeleton, EmptyState, ErrorState,
  SearchInput, Modal, Input, Select, PermissionGate,
} from '@3sc/ui';
import { Permission, UserRole } from '@3sc/types';
import type { User } from '@3sc/types';
import { getDefaultPermissions, getClientAdminToggleablePerm } from '@3sc/permissions';

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { color: string; bg: string }> = {
  [UserRole.CLIENT_ADMIN]: { color: '#b45309', bg: '#fef3c7' },
  [UserRole.CLIENT_USER]:  { color: '#374151', bg: '#f3f4f6' },
};

const ROLE_LABEL: Record<string, string> = {
  [UserRole.CLIENT_ADMIN]: 'Client Admin',
  [UserRole.CLIENT_USER]:  'Client User',
};

const CLIENT_ROLE_OPTIONS = [
  { value: UserRole.CLIENT_USER,  label: 'Client User' },
  { value: UserRole.CLIENT_ADMIN, label: 'Client Admin' },
];

// Friendly names for client-visible permissions
const PERM_LABELS: Partial<Record<Permission, string>> = {
  [Permission.TICKET_CREATE]:       'Create Tickets',
  [Permission.TICKET_VIEW_OWN]:     'View Own Tickets',
  [Permission.TICKET_VIEW_ORG]:     'View All Org Tickets',
  [Permission.TICKET_EDIT]:         'Edit Tickets',
  [Permission.TICKET_STATUS_CHANGE]:'Change Ticket Status',
  [Permission.TICKET_REOPEN]:       'Reopen Tickets',
  [Permission.COMMENT_CREATE]:      'Post Comments',
  [Permission.ATTACHMENT_UPLOAD]:   'Upload Attachments',
  [Permission.ATTACHMENT_DELETE]:   'Delete Attachments',
  [Permission.MEMBER_VIEW]:         'View Team Members',
  [Permission.KB_VIEW]:             'View Knowledge Base',
  [Permission.SLA_VIEW]:            'View SLA Info',
  [Permission.AI_DIGEST]:           'AI Digest',
  [Permission.AI_KB_SUGGEST]:       'AI Knowledge Suggestions',
  [Permission.PROJECT_VIEW]:        'View Projects',
  [Permission.ROADMAP_VOTE]:        'Vote on Roadmap',
  [Permission.ROADMAP_REQUEST]:     'Request Features',
  [Permission.AI_COPILOT_CHAT]:     'AI Copilot Chat',
  [Permission.REPORT_VIEW]:         'View Reports',
  [Permission.REPORT_EXPORT]:       'Export Reports',
  [Permission.WORKSPACE_CONFIGURE]: 'Configure Workspace',
  [Permission.BRANDING_CONFIGURE]:  'Configure Branding',
  [Permission.MEMBER_INVITE]:       'Invite Members',
  [Permission.MEMBER_MANAGE]:       'Manage Members',
};

// ── PermissionsModal ─────────────────────────────────────────────────────────

interface PermissionsModalProps {
  member: User;
  actorPermissions: Permission[];
  onClose: () => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({ member, actorPermissions, onClose }) => {
  const [togglePerm, { isLoading: toggling }] = useToggleTeamMemberPermissionMutation();
  const [confirmPerm, setConfirmPerm] = useState<Permission | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Permissions the actor (CLIENT_ADMIN) is allowed to toggle for their team
  const toggleable = useMemo(
    () => new Set(getClientAdminToggleablePerm(actorPermissions)),
    [actorPermissions],
  );

  // Role defaults for the member
  const roleDefaults = useMemo(() => new Set(getDefaultPermissions(member.role)), [member.role]);

  // Admin-granted overrides on this member (locked read-only for CLIENT_ADMIN)
  const adminGranted = useMemo(() => {
    return new Set(
      (member.permissionOverrides ?? [])
        .filter(o => o.type === 'GRANT' && o.grantedByRole && ['ADMIN', 'LEAD'].includes(o.grantedByRole))
        .map(o => o.permission as unknown as Permission),
    );
  }, [member.permissionOverrides]);

  // Effective permissions
  const effective = useMemo(() => {
    const perms = new Set(roleDefaults);
    (member.permissionOverrides ?? []).forEach(o => {
      if (o.type === 'GRANT') perms.add(o.permission as unknown as Permission);
      if (o.type === 'REVOKE') perms.delete(o.permission as unknown as Permission);
    });
    return perms;
  }, [roleDefaults, member.permissionOverrides]);

  const handleToggle = async (perm: Permission) => {
    setError(null);
    try {
      await togglePerm({ memberId: member.id, permission: perm }).unwrap();
      setConfirmPerm(null);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to update permission.';
      setError(msg);
    }
  };

  // Only show permissions that are client-visible
  const visiblePerms = Object.keys(PERM_LABELS) as Permission[];

  return (
    <Modal isOpen onClose={onClose} title={`Permissions — ${member.displayName}`} width="36rem">
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: '#dcfce7', border: '1px solid #22c55e', display: 'inline-block' }} />
            Role default
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: '#dbeafe', border: '2px solid #3b82f6', display: 'inline-block' }} />
            Admin-granted (locked)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', display: 'inline-block' }} />
            Off
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.625rem 0.875rem', background: '#fef2f2',
          border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto', paddingBottom: '0.25rem' }}>
        {visiblePerms.map(perm => {
          const isOn = effective.has(perm);
          const isDefault = roleDefaults.has(perm);
          const isAdminLocked = adminGranted.has(perm);
          const canToggle = toggleable.has(perm) && !isAdminLocked;

          let bg = 'var(--color-bg-subtle)';
          let border = '1px solid var(--color-border)';
          let color = 'var(--color-text-muted)';
          let cursor = canToggle ? 'pointer' : 'default';

          if (isAdminLocked) { bg = '#dbeafe'; border = '2px solid #3b82f6'; color = '#1d4ed8'; cursor = 'default'; }
          else if (isDefault && isOn) { bg = '#dcfce7'; border = '1px solid #22c55e'; color = '#166534'; }

          return (
            <button
              key={perm}
              disabled={!canToggle || toggling}
              onClick={() => canToggle ? setConfirmPerm(perm) : undefined}
              title={isAdminLocked ? 'Granted by internal admin — cannot be removed here' : undefined}
              style={{
                padding: '0.3125rem 0.75rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem', cursor, transition: 'all 0.15s',
                background: bg, border, color,
                opacity: isOn ? 1 : 0.45,
                fontWeight: isAdminLocked ? 600 : 400,
              }}
            >
              {PERM_LABELS[perm] ?? perm}
              {isAdminLocked && ' 🔒'}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {/* Confirm toggle sub-dialog */}
      {confirmPerm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)',
            padding: '1.5rem', width: '20rem', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
              {effective.has(confirmPerm) ? 'Remove Permission' : 'Add Permission'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              {effective.has(confirmPerm) ? 'Remove' : 'Add'}{' '}
              <strong>{PERM_LABELS[confirmPerm] ?? confirmPerm}</strong>{' '}
              {effective.has(confirmPerm) ? 'from' : 'for'} {member.displayName}?
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmPerm(null)}>Cancel</Button>
              <Button
                onClick={() => handleToggle(confirmPerm)}
                loading={toggling}
                style={{ background: effective.has(confirmPerm) ? '#ef4444' : undefined }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── EditMemberModal ──────────────────────────────────────────────────────────

interface EditMemberModalProps {
  member: User;
  onClose: () => void;
  onSaved: () => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSaved }) => {
  const [updateRole,     { isLoading: saving }]      = useUpdateTeamMemberRoleMutation();
  const [deactivate,     { isLoading: deactivating }] = useDeactivateTeamMemberMutation();

  const [role,      setRole]     = useState<UserRole>(member.role);
  const [isActive,  setIsActive] = useState(member.isActive);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      if (role !== member.role) {
        await updateRole({ memberId: member.id, role }).unwrap();
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Failed to save changes.');
    }
  };

  const handleDeactivate = async () => {
    setError(null);
    try {
      await deactivate(member.id).unwrap();
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Failed to deactivate user.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit — ${member.displayName}`} width="26rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{member.email}</div>

        {error && (
          <div style={{
            padding: '0.625rem 0.875rem', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem', color: '#b91c1c',
          }}>
            {error}
          </div>
        )}

        <Select
          label="Role"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={CLIENT_ROLE_OPTIONS}
        />

        <div style={{
          padding: '0.625rem 0.875rem', background: '#fffbeb',
          border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem', color: '#92400e',
        }}>
          Changing role will reset this user's permissions to the new role's defaults.
        </div>

        {/* Deactivate section */}
        {member.isActive && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
            {!confirmDeactivate ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeactivate(true)}
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                Deactivate Account
              </Button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  This will revoke {member.displayName}'s access. They can be reactivated by an admin.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleDeactivate}
                    loading={deactivating}
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    Confirm Deactivate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── InviteMemberModal ────────────────────────────────────────────────────────

interface InviteMemberModalProps { onClose: () => void; onInvited: () => void; }
const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ onClose, onInvited }) => {
  const [inviteUser, { isLoading: inviting }] = useInviteUserMutation();
  const session = useSession();
  const tenantId = session?.tenantId;

  const { data: projectsData } = useGetProjectsQuery(
    { tenant_id: tenantId },
    { skip: !tenantId },
  );
  const availableProjects = projectsData?.data ?? [];

  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState<UserRole>(UserRole.CLIENT_USER);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error,      setError]      = useState<string | null>(null);
  const [sent,       setSent]       = useState(false);

  const toggleProject = (id: string) =>
    setProjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSend = async () => {
    setError(null);
    if (!tenantId) { setError('Session tenant not available. Please refresh and try again.'); return; }
    try {
      await inviteUser({
        email:      email.trim(),
        first_name: firstName.trim() || undefined,
        last_name:  lastName.trim() || undefined,
        role,
        tenant_id:  tenantId,
        project_ids: projectIds.length ? projectIds : undefined,
      }).unwrap();
      setSent(true);
      setTimeout(() => { onInvited(); onClose(); }, 1800);
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Failed to send invitation.');
    }
  };

  if (sent) {
    return (
      <Modal isOpen onClose={onClose} title="Add Member" width="24rem">
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Member added!</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{email}</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Team Member" width="28rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
          <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </div>
        <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" />
        <Select
          label="Role"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={CLIENT_ROLE_OPTIONS}
        />

        {/* Project assignment */}
        {availableProjects.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-primary)' }}>
              Assign to Projects <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {availableProjects.map(p => {
                const selected = projectIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProject(p.id)}
                    style={{
                      padding: '0.3125rem 0.75rem', borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.15s',
                      background: selected ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                      color: selected ? '#fff' : 'var(--color-text-secondary)',
                      border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      fontWeight: selected ? 500 : 400,
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{
          padding: '0.75rem', background: 'var(--color-bg-subtle)',
          borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-muted)',
        }}>
          An invitation email will be sent once the domain is active. The invitee will set their own password via the link.
        </div>

        {error && (
          <div style={{
            padding: '0.625rem 0.875rem', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem', color: '#b91c1c',
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} loading={inviting} disabled={!email.trim()}>
            Add Team Member
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main TeamManagementPage ──────────────────────────────────────────────────

export const TeamManagementPage: React.FC = () => {
  useDocumentTitle('Team Management');
  const perms = usePermissions();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editTarget, setEditTarget]  = useState<User | null>(null);
  const [permTarget, setPermTarget]  = useState<User | null>(null);
  const [showInvite, setShowInvite]  = useState(false);

  const { data, isLoading, error, refetch } = useGetTeamMembersQuery({
    page,
    role: roleFilter || undefined,
    search: debouncedSearch || undefined,
  });

  const members = data?.data ?? [];
  const activeCount   = members.filter(u => u.isActive).length;
  const adminCount    = members.filter(u => u.role === UserRole.CLIENT_ADMIN).length;

  // Actor's own permissions (for ceiling enforcement in permission modal)
  const actorPermissions = useMemo((): Permission[] => {
    return perms.toArray();
  }, [perms]);

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Team Management
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Manage your organisation's members and their access
          </p>
        </div>
        <PermissionGate permission={Permission.MEMBER_INVITE}>
          <Button onClick={() => setShowInvite(true)} icon={<span>+</span>}>
            Add Member
          </Button>
        </PermissionGate>
      </div>

      {/* Summary stats */}
      {!isLoading && (
        <div style={{
          display: 'flex', gap: '1.5rem', marginBottom: '1.25rem',
          padding: '0.75rem 1rem', background: 'var(--color-bg-subtle)',
          borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
          flexWrap: 'wrap',
        }}>
          <span>Total members: <strong>{data?.total ?? 0}</strong></span>
          <span>Active: <strong style={{ color: '#22c55e' }}>{activeCount}</strong></span>
          <span>Admins: <strong>{adminCount}</strong></span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
        </div>
        <div style={{ width: '10rem' }}>
          <Select
            options={[
              { value: '', label: 'All Roles' },
              ...CLIENT_ROLE_OPTIONS,
            ]}
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="4.5rem" />)}
        </div>
      ) : members.length === 0 ? (
        <EmptyState icon="👥" title="No team members found" description="Try adjusting your search or invite a new member." />
      ) : (
        <Card padding="0">
          {members.map((member, idx) => {
            const rb = ROLE_BADGE[member.role] ?? { color: '#374151', bg: '#f3f4f6' };
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < members.length - 1 ? '1px solid var(--color-border)' : 'none',
                  opacity: member.isActive ? 1 : 0.6,
                }}
              >
                <Avatar name={member.displayName ?? 'Unknown'} src={member.avatarUrl} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.displayName}</span>
                    <Badge color={rb.color} bgColor={rb.bg}>{ROLE_LABEL[member.role] ?? member.role}</Badge>
                    {!member.isActive && (
                      <Badge color="#6b7280" bgColor="#f3f4f6">Inactive</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                    {member.email}
                  </div>
                  {/* Permission override count */}
                  {(member.permissionOverrides ?? []).length > 0 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                      {(member.permissionOverrides ?? []).length} permission override{(member.permissionOverrides ?? []).length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {/* Project memberships */}
                  {(member.projects ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {(member.projects ?? []).map(proj => (
                        <span
                          key={proj.id}
                          style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.6875rem',
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {proj.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <PermissionGate permission={Permission.MEMBER_MANAGE}>
                    <Button variant="ghost" size="sm" onClick={() => setPermTarget(member)}>
                      Permissions
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(member)}>
                      Edit
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: '2rem' }}>
            Page {page} of {data.total_pages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditMemberModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={refetch}
        />
      )}
      {permTarget && (
        <PermissionsModal
          member={permTarget}
          actorPermissions={actorPermissions}
          onClose={() => setPermTarget(null)}
        />
      )}
      {showInvite && (
        <InviteMemberModal onClose={() => setShowInvite(false)} onInvited={refetch} />
      )}
    </div>
  );
};
