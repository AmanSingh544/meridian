import React, { useState, useMemo, useEffect } from 'react';
import {
  useGetUsersQuery,
  useUpdateUserMutation,
  useInviteUserMutation,
  useGetUserSkillsQuery,
  useUpdateUserSkillsMutation,
  useGetSkillsQuery,
  useGetUserWorkloadQuery,
  useUpdateUserWorkloadMutation,
  useGetWorkloadSummaryQuery,
  useGetUserPermissionsQuery,
  useUpdateUserPermissionMutation,
  useGetScoringWeightsQuery,
  useUpdateScoringWeightsMutation,
  useGetSkillGapsQuery,
  useSuggestAgentSkillsMutation,
  useAdminResetPasswordMutation,
  useGetOrganizationsQuery,
  useGetProjectsQuery,
} from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, usePermissions } from '@3sc/hooks';
import {
  SearchInput, Select, Avatar, Badge, Pagination,
  Button, EmptyState, Modal, Input, PermissionGate, Icon,
  MetricCard, MetricGrid, Card,
  DataTable,
} from '@3sc/ui';
import { Plus, Users, UserCheck, UserX, BarChart3, Ticket, Percent } from 'lucide-react';
import {
  Permission, UserRole, InternalSubRole, AvailabilityStatus, ProjectRole,
} from '@3sc/types';
import type {
  User, Skill, UserSkill,
  AssignmentScoringWeightsPayload, PermissionOverridePayload, PermissionOverride,
} from '@3sc/types';
import { getDefaultPermissions, SUB_ROLE_LABELS } from '@3sc/permissions';
import { Column } from 'packages/ui/src/components/DataTable';

// ── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#ef4444',
  LEAD: '#8b5cf6',
  AGENT: '#3b82f6',
  CLIENT_ADMIN: '#f59e0b',
  CLIENT_USER: '#6b7280',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  LEAD: 'Lead',
  AGENT: 'Agent',
  CLIENT_ADMIN: 'Client Admin',
  CLIENT_USER: 'Client User',
};

const INTERNAL_ROLE_OPTIONS = [
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.LEAD, label: 'Lead' },
  { value: UserRole.AGENT, label: 'Agent' },
];

const CLIENT_ROLE_OPTIONS = [
  { value: UserRole.CLIENT_ADMIN, label: 'Client Admin' },
  { value: UserRole.CLIENT_USER, label: 'Client User' },
];

const ALL_ROLE_OPTIONS = [...INTERNAL_ROLE_OPTIONS, ...CLIENT_ROLE_OPTIONS];

const SUB_ROLE_OPTIONS = Object.entries(SUB_ROLE_LABELS).map(([value, label]) => ({ value, label }));

const AVAIL_STATUS_OPTIONS = [
  { value: AvailabilityStatus.AVAILABLE, label: 'Available' },
  { value: AvailabilityStatus.BUSY, label: 'Busy' },
  { value: AvailabilityStatus.AWAY, label: 'Away' },
  { value: AvailabilityStatus.DO_NOT_DISTURB, label: 'Do Not Disturb' },
  { value: AvailabilityStatus.OFFLINE, label: 'Offline' },
];

const SKILL_LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'EXPERT', label: 'Expert' },
];

const AVAIL_COLORS: Record<string, string> = {
  [AvailabilityStatus.AVAILABLE]: '#22c55e',
  [AvailabilityStatus.BUSY]: '#f59e0b',
  [AvailabilityStatus.AWAY]: '#94a3b8',
  [AvailabilityStatus.DO_NOT_DISTURB]: '#ef4444',
  [AvailabilityStatus.OFFLINE]: '#6b7280',
};

// Group permissions for the permission matrix
const PERMISSION_GROUPS: { label: string; perms: Permission[] }[] = [
  {
    label: 'Tickets',
    perms: [
      Permission.TICKET_VIEW_ALL, Permission.TICKET_EDIT, Permission.TICKET_STATUS_CHANGE,
      Permission.TICKET_ASSIGN, Permission.TICKET_DELETE, Permission.TICKET_REOPEN,
      Permission.TICKET_CREATE, Permission.TICKET_VIEW_OWN, Permission.TICKET_VIEW_ORG,
    ],
  },
  {
    label: 'Comments',
    perms: [Permission.COMMENT_CREATE, Permission.COMMENT_INTERNAL, Permission.COMMENT_DELETE],
  },
  {
    label: 'Members',
    perms: [Permission.MEMBER_VIEW, Permission.MEMBER_INVITE, Permission.MEMBER_MANAGE],
  },
  {
    label: 'Knowledge Base',
    perms: [Permission.KB_VIEW, Permission.KB_MANAGE],
  },
  {
    label: 'Reports',
    perms: [Permission.REPORT_VIEW, Permission.REPORT_EXPORT],
  },
  {
    label: 'SLA & Escalations',
    perms: [
      Permission.SLA_VIEW, Permission.SLA_CONFIGURE,
      Permission.ESCALATION_VIEW, Permission.ESCALATION_CONFIGURE,
      Permission.ROUTING_VIEW,
    ],
  },
  {
    label: 'AI',
    perms: [
      Permission.AI_SUGGEST, Permission.AI_FEEDBACK, Permission.AI_DIGEST,
      Permission.AI_KB_SUGGEST, Permission.AI_PROJECT_INSIGHTS,
      Permission.AI_PROJECT_REPORTS, Permission.AI_PROJECT_QA,
      Permission.AI_COPILOT_CHAT, Permission.AI_COPILOT_WRITE,
    ],
  },
  {
    label: 'Projects & Delivery',
    perms: [
      Permission.PROJECT_VIEW, Permission.PROJECT_CREATE, Permission.PROJECT_EDIT, Permission.PROJECT_DELETE,
      Permission.DELIVERY_VIEW, Permission.DELIVERY_MANAGE,
      Permission.ONBOARDING_VIEW, Permission.ONBOARDING_MANAGE,
    ],
  },
  {
    label: 'Roadmap',
    perms: [Permission.ROADMAP_VOTE, Permission.ROADMAP_REQUEST],
  },
  {
    label: 'System & Compliance',
    perms: [
      Permission.AUDIT_VIEW, Permission.WORKSPACE_CONFIGURE,
      Permission.BRANDING_CONFIGURE, Permission.SYSTEM_CONFIGURE, Permission.COMPLIANCE_VIEW,
    ],
  },
  {
    label: 'User Management',
    perms: [
      Permission.USER_PERMISSION_MANAGE, Permission.SKILL_ASSIGN, Permission.WORKLOAD_VIEW,
      Permission.SCORING_CONFIGURE, Permission.USER_IMPORT, Permission.PASSWORD_RESET,
    ],
  },
];

const PERM_LABELS: Partial<Record<Permission, string>> = {
  [Permission.TICKET_VIEW_ALL]: 'View All Tickets',
  [Permission.TICKET_VIEW_OWN]: 'View Own Tickets',
  [Permission.TICKET_VIEW_ORG]: 'View Org Tickets',
  [Permission.TICKET_EDIT]: 'Edit Tickets',
  [Permission.TICKET_STATUS_CHANGE]: 'Change Status',
  [Permission.TICKET_ASSIGN]: 'Assign Tickets',
  [Permission.TICKET_DELETE]: 'Delete Tickets',
  [Permission.TICKET_REOPEN]: 'Reopen Tickets',
  [Permission.TICKET_CREATE]: 'Create Tickets',
  [Permission.COMMENT_CREATE]: 'Create Comments',
  [Permission.COMMENT_INTERNAL]: 'Internal Notes',
  [Permission.COMMENT_DELETE]: 'Delete Comments',
  [Permission.MEMBER_VIEW]: 'View Members',
  [Permission.MEMBER_INVITE]: 'Invite Members',
  [Permission.MEMBER_MANAGE]: 'Manage Members',
  [Permission.KB_VIEW]: 'View KB',
  [Permission.KB_MANAGE]: 'Manage KB',
  [Permission.REPORT_VIEW]: 'View Reports',
  [Permission.REPORT_EXPORT]: 'Export Reports',
  [Permission.SLA_VIEW]: 'View SLAs',
  [Permission.SLA_CONFIGURE]: 'Configure SLAs',
  [Permission.ESCALATION_VIEW]: 'View Escalations',
  [Permission.ESCALATION_CONFIGURE]: 'Configure Escalations',
  [Permission.ROUTING_VIEW]: 'View Routing',
  [Permission.AI_SUGGEST]: 'AI Suggestions',
  [Permission.AI_FEEDBACK]: 'AI Feedback',
  [Permission.AI_DIGEST]: 'AI Digest',
  [Permission.AI_KB_SUGGEST]: 'AI KB Suggest',
  [Permission.AI_PROJECT_INSIGHTS]: 'AI Project Insights',
  [Permission.AI_PROJECT_REPORTS]: 'AI Project Reports',
  [Permission.AI_PROJECT_QA]: 'AI Project QA',
  [Permission.PROJECT_VIEW]: 'View Projects',
  [Permission.PROJECT_CREATE]: 'Create Projects',
  [Permission.PROJECT_EDIT]: 'Edit Projects',
  [Permission.PROJECT_DELETE]: 'Delete Projects',
  [Permission.DELIVERY_VIEW]: 'View Delivery Board',
  [Permission.DELIVERY_MANAGE]: 'Manage Delivery',
  [Permission.ONBOARDING_VIEW]: 'View Onboarding',
  [Permission.ONBOARDING_MANAGE]: 'Manage Onboarding',
  [Permission.ROADMAP_VOTE]: 'Vote on Roadmap',
  [Permission.ROADMAP_REQUEST]: 'Request Features',
  [Permission.AUDIT_VIEW]: 'View Audit Log',
  [Permission.WORKSPACE_CONFIGURE]: 'Configure Workspace',
  [Permission.BRANDING_CONFIGURE]: 'Configure Branding',
  [Permission.SYSTEM_CONFIGURE]: 'System Config',
  [Permission.COMPLIANCE_VIEW]: 'View Compliance',
  [Permission.USER_PERMISSION_MANAGE]: 'Manage User Perms',
  [Permission.SKILL_ASSIGN]: 'Assign Skills',
  [Permission.WORKLOAD_VIEW]: 'View Workload',
  [Permission.SCORING_CONFIGURE]: 'Configure Scoring',
  [Permission.USER_IMPORT]: 'Import Users',
  [Permission.PASSWORD_RESET]: 'Reset Passwords',
  [Permission.AI_COPILOT_CHAT]: 'AI Copilot Chat',
  [Permission.AI_COPILOT_WRITE]: 'AI Copilot Write',
};

// ── Sub-components ───────────────────────────────────────────────────────────

interface WorkloadBarProps {
  pct: number;
  status: AvailabilityStatus;
}
const WorkloadBar: React.FC<WorkloadBarProps> = ({ pct, status }) => {
  const fill = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: '4rem', height: '0.375rem', borderRadius: '999px', background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: fill, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '2rem' }}>{pct}%</span>
      <div
        title={status}
        style={{
          width: '0.5rem', height: '0.5rem', borderRadius: '50%',
          background: AVAIL_COLORS[status] ?? '#6b7280',
        }}
      />
    </div>
  );
};

interface SkillChipProps { skill: UserSkill; skillMap: Record<string, Skill>; }
const SkillChip: React.FC<SkillChipProps> = ({ skill, skillMap }) => {
  const s = skillMap[skill.skillId];
  if (!s) return null;
  const lvlColors: Record<string, string> = { BEGINNER: '#94a3b8', INTERMEDIATE: '#3b82f6', EXPERT: '#8b5cf6' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 500,
      background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)',
    }}>
      <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: lvlColors[skill.level] ?? '#94a3b8' }} />
      {s.name}
    </span>
  );
};

// ── PermissionModal ──────────────────────────────────────────────────────────

interface PermissionModalProps {
  user: User;
  onClose: () => void;
}
const PermissionModal: React.FC<PermissionModalProps> = ({ user, onClose }) => {
  const { data: permData, isLoading } = useGetUserPermissionsQuery(user.id);
  const [updatePerm, { isLoading: saving }] = useUpdateUserPermissionMutation();

  const [confirmPerm, setConfirmPerm] = useState<Permission | null>(null);
  const [confirmAction, setConfirmAction] = useState<'grant' | 'revoke' | null>(null);
  const [reason, setReason] = useState('');

  const roleDefaults = useMemo(() => new Set(getDefaultPermissions(user.role)), [user.role]);

  const overrides: PermissionOverride[] = permData?.overrides ?? [];

  const overrideMap = useMemo(() => {
    const m: Record<string, PermissionOverride> = {};
    overrides.forEach(o => { m[o.permission] = o; });
    return m;
  }, [overrides]);

  const effective = useMemo(() => {
    const perms = new Set(roleDefaults);
    overrides.forEach(o => {
      if (o.type === 'GRANT') perms.add(o.permission as unknown as Permission);
      if (o.type === 'REVOKE') perms.delete(o.permission as unknown as Permission);
    });
    return perms;
  }, [roleDefaults, overrides]);

  const handleConfirm = async () => {
    if (!confirmPerm || !confirmAction) return;
    const payload: PermissionOverridePayload = {
      permission: confirmPerm,
      type: confirmAction === 'grant' ? 'GRANT' : 'REVOKE',
      reason: reason.trim() || undefined,
    };
    await updatePerm({ userId: user.id, payload }).unwrap();
    setConfirmPerm(null);
    setConfirmAction(null);
    setReason('');
  };

  const startToggle = (perm: Permission) => {
    const isOn = effective.has(perm);
    setConfirmPerm(perm);
    setConfirmAction(isOn ? 'revoke' : 'grant');
    setReason('');
  };

  return (
    <Modal isOpen onClose={onClose} title={`Permissions — ${user.displayName}`} width="44rem">
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          <div style={{
            display: 'flex', gap: '1.5rem', marginBottom: '1rem',
            padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: '#dcfce7', border: '1px solid #22c55e', display: 'inline-block' }} />
              Role default (on)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: '#d1fae5', border: '2px solid #22c55e', display: 'inline-block' }} />
              GRANT override
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '2px', background: '#fee2e2', border: '2px solid #ef4444', display: 'inline-block' }} />
              REVOKE override
            </span>
          </div>

          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {group.perms.map(perm => {
                  const isDefault = roleDefaults.has(perm);
                  const override = overrideMap[perm];
                  const isGranted = override?.type === 'GRANT';
                  const isRevoked = override?.type === 'REVOKE';
                  const isEffective = effective.has(perm);

                  let bg = 'var(--color-bg-subtle)';
                  let border = '1px solid var(--color-border)';
                  let color = 'var(--color-text-muted)';

                  if (isGranted) { bg = '#d1fae5'; border = '2px solid #22c55e'; color = '#166534'; }
                  else if (isRevoked) { bg = '#fee2e2'; border = '2px solid #ef4444'; color = '#991b1b'; }
                  else if (isDefault) { bg = '#dcfce7'; border = '1px solid #22c55e'; color = '#166534'; }

                  return (
                    <button
                      key={perm}
                      title={override ? `${override.type} by ${override.grantedBy} — ${override.reason ?? 'no reason'}` : undefined}
                      onClick={() => startToggle(perm)}
                      style={{
                        padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                        background: bg, border, color,
                        opacity: isEffective ? 1 : 0.45,
                        fontWeight: isGranted || isRevoked ? 600 : 400,
                      }}
                    >
                      {PERM_LABELS[perm] ?? perm}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm sub-dialog */}
      {confirmPerm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)',
            padding: '1.5rem', width: '22rem', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
              {confirmAction === 'grant' ? 'Grant' : 'Revoke'} Permission
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              {confirmAction === 'grant' ? 'Add' : 'Remove'} <strong>{PERM_LABELS[confirmPerm] ?? confirmPerm}</strong> for {user.displayName}?
            </div>
            <Input
              label="Reason (optional)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Audit trail note…"
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="ghost" onClick={() => setConfirmPerm(null)}>Cancel</Button>
              <Button
                onClick={handleConfirm}
                loading={saving}
                style={{ background: confirmAction === 'revoke' ? '#ef4444' : undefined }}
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

// ── SkillsModal ──────────────────────────────────────────────────────────────

interface SkillsModalProps { user: User; allSkills: Skill[]; onClose: () => void; }
const SkillsModal: React.FC<SkillsModalProps> = ({ user, allSkills, onClose }) => {
  const { data: currentSkills = [], isLoading } = useGetUserSkillsQuery(user.id);
  const [updateSkills, { isLoading: saving }] = useUpdateUserSkillsMutation();
  const [suggestSkills, { isLoading: suggesting }] = useSuggestAgentSkillsMutation();

  const [draft, setDraft] = useState<UserSkill[]>([]);

  // Initialize draft when data loads — useEffect avoids the render-body anti-pattern
  useEffect(() => {
    if (!isLoading) {
      setDraft([...currentSkills]);
    }
  }, [currentSkills, isLoading]);

  const toggleSkill = (skill: Skill) => {
    setDraft(prev => {
      const existing = prev.find(s => s.skillId === skill.id);
      if (existing) return prev.filter(s => s.skillId !== skill.id);
      return [...prev, { skillId: skill.id, level: 'INTERMEDIATE' as const, endorsements: 0 }];
    });
  };

  const setLevel = (skillId: string, level: UserSkill['level']) => {
    setDraft(prev => prev.map(s => s.skillId === skillId ? { ...s, level } : s));
  };

  const handleSuggest = async () => {
    const result = await suggestSkills(user.id).unwrap();
    setDraft(prev => {
      const existing = new Set(prev.map(s => s.skillId));
      const newOnes = result.suggestedSkills
        .filter((s: Skill) => !existing.has(s.id))
        .map((s: Skill) => ({ skillId: s.id, level: 'INTERMEDIATE' as const, endorsements: 0 }));
      return [...prev, ...newOnes];
    });
  };

  const handleSave = async () => {
    await updateSkills({
      userId: user.id,
      skillIds: draft.map(s => ({ skillId: s.skillId, level: s.level })),
    }).unwrap();
    onClose();
  };

  // Group skills by category
  const categories = useMemo(() => {
    const cats: Record<string, Skill[]> = {};
    allSkills.forEach(s => {
      if (!cats[s.category]) cats[s.category] = [];
      cats[s.category].push(s);
    });
    return cats;
  }, [allSkills]);

  const draftSet = new Set(draft.map(s => s.skillId));

  return (
    <Modal isOpen onClose={onClose} title={`Skills — ${user.displayName}`} width="42rem">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          {draft.length} skill{draft.length !== 1 ? 's' : ''} selected
        </span>
        <Button variant="secondary" size="sm" onClick={handleSuggest} loading={suggesting}>
          AI Suggest
        </Button>
      </div>

      <div style={{ maxHeight: '55vh', overflowY: 'auto', marginBottom: '1rem' }}>
        {Object.entries(categories).map(([cat, skills]) => (
          <div key={cat} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              {cat}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {skills.map(skill => {
                const selected = draftSet.has(skill.id);
                const userSkill = draft.find(s => s.skillId === skill.id);
                return (
                  <div key={skill.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => toggleSkill(skill)}
                      style={{
                        padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem', cursor: 'pointer',
                        background: selected ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                        color: selected ? '#fff' : 'var(--color-text-secondary)',
                        border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      }}
                    >
                      {skill.name}
                    </button>
                    {selected && userSkill && (
                      <Select
                        label=""
                        style={{
                          fontSize: '0.6875rem', padding: '0.125rem 0.25rem',
                          borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-surface)', cursor: 'pointer',
                        }}
                        value={userSkill.level}
                        onChange={e => setLevel(skill.id, e.target.value as UserSkill['level'])}
                        options={SKILL_LEVEL_OPTIONS}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>Save Skills</Button>
      </div>
    </Modal>
  );
};

// ── WorkloadModal ────────────────────────────────────────────────────────────

interface WorkloadModalProps { user: User; onClose: () => void; }
const WorkloadModal: React.FC<WorkloadModalProps> = ({ user, onClose }) => {
  const { data: workload, isLoading } = useGetUserWorkloadQuery(user.id);
  const [updateWorkload, { isLoading: saving }] = useUpdateUserWorkloadMutation();

  const [maxCap, setMaxCap] = useState('');
  const [status, setStatus] = useState<AvailabilityStatus>(AvailabilityStatus.AVAILABLE);

  // Initialize form fields when data loads
  useEffect(() => {
    if (workload && !isLoading) {
      setMaxCap(String(workload.maxCapacity));
      setStatus(workload.availabilityStatus);
    }
  }, [workload, isLoading]);

  const handleSave = async () => {
    await updateWorkload({
      userId: user.id,
      data: { maxCapacity: Number(maxCap), availabilityStatus: status },
    }).unwrap();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Workload — ${user.displayName}`} width="24rem">
      {isLoading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workload && (
            <MetricGrid density="compact">
              <MetricCard
                title="Assigned tickets"
                value={workload.assignedTickets}
                variant="brand"
                icon={<Icon icon={Ticket} />}
                state="ready"
              />
              <MetricCard
                title="Utilization"
                value={`${workload.utilizationPct}%`}
                variant="info"
                icon={<Icon icon={Percent} />}
                state="ready"
              />
            </MetricGrid>
          )}

          <Input
            label="Max Capacity (tickets)"
            type="number"
            value={maxCap}
            onChange={e => setMaxCap(e.target.value)}
            placeholder="20"
          />

          <Select
            label="Availability Status"
            value={status}
            onChange={e => setStatus(e.target.value as AvailabilityStatus)}
            options={AVAIL_STATUS_OPTIONS}
          />

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── ScoringWeightsPanel ──────────────────────────────────────────────────────

const ScoringWeightsPanel: React.FC = () => {
  const { data: weights, isLoading } = useGetScoringWeightsQuery();
  const [updateWeights, { isLoading: saving }] = useUpdateScoringWeightsMutation();
  const { data: skillGaps } = useGetSkillGapsQuery();

  const [wSkill, setWSkill] = useState(50);
  const [wWorkload, setWWorkload] = useState(35);
  const [wAvail, setWAvail] = useState(15);
  const [dirty, setDirty] = useState(false);

  // Initialize sliders from API data — useEffect avoids the render-body anti-pattern
  useEffect(() => {
    if (weights && !isLoading) {
      setWSkill(Math.round(weights.wSkill * 100));
      setWWorkload(Math.round(weights.wWorkload * 100));
      setWAvail(Math.round(weights.wAvail * 100));
    }
  }, [weights, isLoading]);

  const total = wSkill + wWorkload + wAvail;
  const valid = total === 100;

  const handleChange = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(Number(e.target.value));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!valid) return;
    const payload: AssignmentScoringWeightsPayload = {
      wSkill: wSkill / 100,
      wWorkload: wWorkload / 100,
      wAvail: wAvail / 100,
    };
    await updateWeights(payload).unwrap();
    setDirty(false);
  };

  return (
    <Card hover style={{
      background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Assignment Scoring Weights</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
            score = (skillMatch × wSkill) + ((1 − utilization) × wWorkload) + (availability × wAvail)
          </div>
        </div>
        {dirty && (
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!valid}>
            Save Weights
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
            {[
              { label: 'Skill Match Weight (wSkill)', value: wSkill, setter: setWSkill, color: '#8b5cf6' },
              { label: 'Workload Weight (wWorkload)', value: wWorkload, setter: setWWorkload, color: '#3b82f6' },
              { label: 'Availability Weight (wAvail)', value: wAvail, setter: setWAvail, color: '#22c55e' },
            ].map(({ label, value, setter, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8125rem' }}>{label}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{value}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={value}
                  onChange={handleChange(setter)}
                  style={{ width: '100%', accentColor: color }}
                />
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
            background: valid ? '#dcfce7' : '#fee2e2',
            fontSize: '0.8125rem', fontWeight: 500,
            color: valid ? '#166534' : '#991b1b',
          }}>
            {valid ? '✓ Weights sum to 100%' : `⚠ Weights sum to ${total}% — must equal 100%`}
          </div>
        </>
      )}

      {/* Skill Gap Alert */}
      {skillGaps && skillGaps.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#92400e' }}>
            Skill Gaps Detected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {skillGaps.map((gap, i) => (
              <div key={gap.skillId ?? i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-sm)',
                background: '#fffbeb', border: '1px solid #fbbf24',
                fontSize: '0.75rem',
              }}>
                <span>{gap.skillName}</span>
                <span style={{ color: '#92400e', fontWeight: 600 }}>
                  {gap.openTickets} open ticket{gap.openTickets !== 1 ? 's' : ''} unmatched
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// ── EditUserModal ────────────────────────────────────────────────────────────

interface EditUserModalProps { user: User; onClose: () => void; onSaved: () => void; }
const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSaved }) => {
  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: resetting }] = useAdminResetPasswordMutation();

  const [role, setRole] = useState<UserRole>(user.role);
  const [subRole, setSubRole] = useState<InternalSubRole | ''>(user.internal_sub_role ?? '');
  const [department, setDepartment] = useState(user.department ?? '');
  const [timezone, setTimezone] = useState(user.timezone ?? '');
  const [isActive, setIsActive] = useState(user.isActive);
  const [resetSent, setResetSent] = useState(false);

  const isInternal = [UserRole.ADMIN, UserRole.LEAD, UserRole.AGENT].includes(role);

  const handleSave = async () => {
    await updateUser({
      id: user.id,
      payload: {
        role,
        isActive,
        ...(isInternal && subRole ? { internalSubRole: subRole as InternalSubRole } : {}),
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
      },
    }).unwrap();
    onSaved();
    onClose();
  };

  const handleResetPw = async () => {
    await resetPassword(user.id).unwrap();
    setResetSent(true);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit — ${user.displayName}`} width="28rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{user.email}</div>

        <Select
          label="Role"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={ALL_ROLE_OPTIONS}
        />

        {isInternal && (
          <Select
            label="Sub-Role"
            value={subRole}
            onChange={e => setSubRole(e.target.value as InternalSubRole)}
            options={[{ value: '', label: '— None —' }, ...SUB_ROLE_OPTIONS]}
          />
        )}

        <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
        <Input label="Timezone" value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. Europe/London" />

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Active account
        </label>

        <PermissionGate permission={Permission.PASSWORD_RESET}>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
            <Button variant="secondary" size="sm" onClick={handleResetPw} loading={resetting} disabled={resetSent}>
              {resetSent ? '✓ Reset email sent' : 'Send Password Reset'}
            </Button>
          </div>
        </PermissionGate>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── InviteModal ──────────────────────────────────────────────────────────────

interface InviteModalProps { tab: 'internal' | 'clients'; onClose: () => void; onInvited: () => void; }
const InviteModal: React.FC<InviteModalProps> = ({ tab, onClose, onInvited }) => {
  return tab === 'internal'
    ? <InternalInviteForm onClose={onClose} onInvited={onInvited} />
    : <ClientInviteForm onClose={onClose} onInvited={onInvited} />;
};

// ── InternalInviteForm ───────────────────────────────────────────────────────

const INTERNAL_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // 3SC Internal (ORG-001)
const INTERNAL_TENANT_NAME = '3SC Internal';

const InternalInviteForm: React.FC<{ onClose: () => void; onInvited: () => void }> = ({ onClose, onInvited }) => {
  const [inviteUser, { isLoading: inviting }] = useInviteUserMutation();
  const { data: allSkills = [] } = useGetSkillsQuery();
  const { data: projectsData } = useGetProjectsQuery({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [subRole, setSubRole] = useState<string>(InternalSubRole.SUPPORT);
  const [department, setDepartment] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const projectOptions = (projectsData?.data ?? []).map(p => ({ value: p.id, label: p.name }));
  const skillOptions = allSkills.map(s => ({ value: s.id, label: s.name }));

  const handleInvite = async () => {
    setError(null);
    try {
      await inviteUser({
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        role,
        tenant_id: INTERNAL_TENANT_ID,
        internal_sub_role: subRole || undefined,
        department: department.trim() || undefined,
        project_ids: projectIds.length ? projectIds : undefined,
        skill_ids: skillIds.length ? skillIds : undefined,
      }).unwrap();
      onInvited();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message ?? 'Failed to add staff member.');
    }
  };

  const valid = email.trim() && firstName.trim() && lastName.trim() && !!subRole;

  return (
    <Modal isOpen onClose={onClose} title="Add Staff Member" width="30rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input label="First Name *" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
          <Input label="Last Name *" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </div>
        <Input label="Email Address *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@3sc.com" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Select label="Role *" value={role} onChange={e => setRole(e.target.value as UserRole)} options={INTERNAL_ROLE_OPTIONS} />
          <Select label="Sub-Role *" value={subRole} onChange={e => setSubRole(e.target.value)} options={SUB_ROLE_OPTIONS} />
        </div>
        <Input label="Department (optional)" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />

        {/* Tenant — read-only */}
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Tenant</div>
          <div style={{
            padding: '0.5rem 0.75rem', background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem', color: 'var(--color-text-muted)',
          }}>
            {INTERNAL_TENANT_NAME}
          </div>
        </div>

        {/* Project assignment — optional */}
        {projectOptions.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
              Assign to Projects (optional)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {projectOptions.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProjectIds(prev => prev.includes(p.value) ? prev.filter(id => id !== p.value) : [...prev, p.value])}
                  style={{
                    padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                    border: `1px solid ${projectIds.includes(p.value) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: projectIds.includes(p.value) ? 'var(--color-accent-subtle)' : 'transparent',
                    color: projectIds.includes(p.value) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: '0.8125rem', cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skill assignment — optional */}
        {skillOptions.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
              Assign Skills (optional)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxHeight: '6rem', overflowY: 'auto' }}>
              {skillOptions.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSkillIds(prev => prev.includes(s.value) ? prev.filter(id => id !== s.value) : [...prev, s.value])}
                  style={{
                    padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                    border: `1px solid ${skillIds.includes(s.value) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: skillIds.includes(s.value) ? 'var(--color-accent-subtle)' : 'transparent',
                    color: skillIds.includes(s.value) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: '0.8125rem', cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {projectIds.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No projects assigned — you can assign projects later from the user detail.
          </div>
        )}

        {error && <div style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite} loading={inviting} disabled={!valid}>Add Staff Member</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── ClientInviteForm ─────────────────────────────────────────────────────────

const ClientInviteForm: React.FC<{ onClose: () => void; onInvited: () => void }> = ({ onClose, onInvited }) => {
  const [inviteUser, { isLoading: inviting }] = useInviteUserMutation();
  const { data: orgsData } = useGetOrganizationsQuery({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT_USER);
  const [tenantId, setTenantId] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: projectsData } = useGetProjectsQuery(
    { tenant_id: tenantId },
    { skip: !tenantId },
  );

  const orgOptions = [
    { value: '', label: '— Select organisation —' },
    ...(orgsData?.data ?? []).map(o => ({ value: o.id, label: o.name })),
  ];
  const projectOptions = (projectsData?.data ?? []).map(p => ({ value: p.id, label: p.name }));

  const handleTenantChange = (newTenantId: string) => {
    setTenantId(newTenantId);
    setProjectIds([]); // reset projects when tenant changes
  };

  const handleInvite = async () => {
    setError(null);
    try {
      await inviteUser({
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        role,
        tenant_id: tenantId,
        project_ids: projectIds.length ? projectIds : undefined,
      }).unwrap();
      onInvited();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message ?? 'Failed to add client user.');
    }
  };

  const valid = email.trim() && firstName.trim() && lastName.trim() && !!tenantId;

  return (
    <Modal isOpen onClose={onClose} title="Add Client User" width="30rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input label="First Name *" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
          <Input label="Last Name *" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </div>
        <Input label="Email Address *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@client.com" />
        <Select label="Role *" value={role} onChange={e => setRole(e.target.value as UserRole)} options={CLIENT_ROLE_OPTIONS} />

        {/* Tenant selector — required */}
        <Select
          label="Client / Tenant *"
          value={tenantId}
          onChange={e => handleTenantChange(e.target.value)}
          options={orgOptions}
        />

        {/* Project assignment — only available after tenant selected */}
        {tenantId && (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
              Assign to Projects (optional)
            </div>
            {projectOptions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {projectOptions.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProjectIds(prev => prev.includes(p.value) ? prev.filter(id => id !== p.value) : [...prev, p.value])}
                    style={{
                      padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                      border: `1px solid ${projectIds.includes(p.value) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: projectIds.includes(p.value) ? 'var(--color-accent-subtle)' : 'transparent',
                      color: projectIds.includes(p.value) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: '0.8125rem', cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No projects found for this organisation.
              </div>
            )}
          </div>
        )}

        {error && <div style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite} loading={inviting} disabled={!valid}>Add Client User</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── InternalUserRow ──────────────────────────────────────────────────────────

interface InternalUserRowProps {
  user: User;
  skillMap: Record<string, Skill>;
  onEdit: () => void;
  onPermissions: () => void;
  onSkills: () => void;
  onWorkload: () => void;
  onToggleActive: () => void;
}
const InternalUserRow: React.FC<InternalUserRowProps> = ({
  user, skillMap, onEdit, onPermissions, onSkills, onWorkload, onToggleActive,
}) => {
  const workload = user.workload;
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={user.displayName ?? 'Unknown'} src={user.avatarUrl} size={30} />
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{user.displayName ?? 'Unknown'}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Badge color={ROLE_COLORS[user.role]} bgColor={`${ROLE_COLORS[user.role]}22`}>
            {ROLE_LABELS[user.role]}
          </Badge>
          {user.internal_sub_role && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {SUB_ROLE_LABELS[user.internal_sub_role]}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        {workload ? (
          <WorkloadBar pct={workload.utilizationPct} status={workload.availabilityStatus} />
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '14rem' }}>
          {(user.skills ?? []).slice(0, 3).map(s => (
            <SkillChip key={s.skillId} skill={s} skillMap={skillMap} />
          ))}
          {(user.skills ?? []).length > 3 && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              +{(user.skills ?? []).length - 3}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <Badge
          color={user.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={user.isActive ? '#dcfce7' : '#f3f4f6'}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={onPermissions}>Perms</Button>
          </PermissionGate>
          <PermissionGate permission={Permission.SKILL_ASSIGN}>
            <Button variant="ghost" size="sm" onClick={onSkills}>Skills</Button>
          </PermissionGate>
          <PermissionGate permission={Permission.WORKLOAD_VIEW}>
            <Button variant="ghost" size="sm" onClick={onWorkload}>Workload</Button>
          </PermissionGate>
          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button
              variant="ghost" size="sm" onClick={onToggleActive}
              style={{ color: user.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </PermissionGate>
        </div>
      </td>
    </tr>
  );
};

// ── Main UsersPage ───────────────────────────────────────────────────────────

export const UsersPage: React.FC = () => {
  useDocumentTitle('Users');
  const perms = usePermissions();

  const [activeTab, setActiveTab] = useState<'internal' | 'clients'>('internal');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subRoleFilter, setSubRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Modals
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [skillTarget, setSkillTarget] = useState<User | null>(null);
  const [wloadTarget, setWloadTarget] = useState<User | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  // ── Data queries ──────────────────────────────────────────────────────────
  const internalRoles = [UserRole.ADMIN, UserRole.LEAD, UserRole.AGENT];
  const clientRoles = [UserRole.CLIENT_ADMIN, UserRole.CLIENT_USER];

  const { data, isLoading, refetch } = useGetUsersQuery({
    page,
    role: roleFilter || (activeTab === 'internal' ? 'ADMIN,LEAD,AGENT' : 'CLIENT_ADMIN,CLIENT_USER'),
    search: debouncedSearch || undefined,
    tenant_id: activeTab === 'clients' ? '' : undefined,
  });

  const { data: allSkills = [] } = useGetSkillsQuery();
  const { data: workloadSummary } = useGetWorkloadSummaryQuery();

  const [updateUser] = useUpdateUserMutation();

  const skillMap = useMemo(() => {
    const m: Record<string, Skill> = {};
    allSkills.forEach(s => { m[s.id] = s; });
    return m;
  }, [allSkills]);

  const workloadStats = workloadSummary ?? null;

  const handleToggleActive = async (user: User) => {
    await updateUser({ id: user.id, payload: { isActive: !user.isActive } }).unwrap();
    refetch();
  };

  const handleTabChange = (tab: 'internal' | 'clients') => {
    setActiveTab(tab);
    setRoleFilter('');
    setSubRoleFilter('');
    setSearch('');
    setPage(1);
  };

  // Filter role options based on tab
  const roleFilterOptions = activeTab === 'internal'
    ? [{ value: '', label: 'All Roles' }, ...INTERNAL_ROLE_OPTIONS]
    : [{ value: '', label: 'All Roles' }, ...CLIENT_ROLE_OPTIONS];

  // Client users grouped by org
  const clientsByOrg = useMemo(() => {
    const users = (data?.data ?? []).filter(u => clientRoles.includes(u.role));
    const map: Record<string, User[]> = {};
    users.forEach(u => {
      const org = u.organizationDetail?.name ?? 'Unknown Org';
      if (!map[org]) map[org] = [];
      map[org].push(u);
    });
    return map;
  }, [data?.data]);

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      sortable: true,
      width: '10rem',
      render: (user: User) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: 0,
          }}
        >
          <Avatar
            name={user.displayName ?? 'Unknown'}
            src={user.avatarUrl}
            size={30}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: '0.8125rem',
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.displayName ?? 'Unknown'}
            </div>

            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.email}
            </div>
          </div>
        </div>
      ),
    },

    {
      key: 'role',
      header: 'Role / Sub-Role',
      width: '10rem',
      render: (user: User) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <Badge
            color={ROLE_COLORS[user.role]}
            bgColor={`${ROLE_COLORS[user.role]}22`}
          >
            {ROLE_LABELS[user.role]}
          </Badge>

          {user.internal_sub_role && (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {SUB_ROLE_LABELS[user.internal_sub_role]}
            </span>
          )}
        </div>
      ),
    },

    {
      key: 'workload',
      header: 'Workload',
      width: '10rem',
      render: (user: User) => {
        const workload = user.workload;

        return workload ? (
          <WorkloadBar
            pct={workload.utilizationPct}
            status={workload.availabilityStatus}
          />
        ) : (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            —
          </span>
        );
      },
    },

    {
      key: 'skills',
      header: 'Skills',
      width: '16rem',
      render: (user: User) => (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            maxWidth: '14rem',
          }}
        >
          {(user.skills ?? []).slice(0, 3).map((s) => (
            <SkillChip
              key={s.skillId}
              skill={s}
              skillMap={skillMap}
            />
          ))}

          {(user.skills ?? []).length > 3 && (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
              }}
            >
              +{(user.skills ?? []).length - 3}
            </span>
          )}
        </div>
      ),
    },

    {
      key: 'status',
      header: 'Status',
      width: '5rem',
      render: (user: User) => (
        <Badge
          color={
            user.isActive
              ? 'var(--color-success)'
              : 'var(--color-text-muted)'
          }
          bgColor={
            user.isActive
              ? '#dcfce7'
              : '#f3f4f6'
          }
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },

    {
      key: 'actions',
      header: 'Actions',
      width: '20rem',
      render: (user: User) => (
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            justifyContent: 'flex-end',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditTarget(user);
              }}
            >
              Edit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPermTarget(user);
              }}
            >
              Perms
            </Button>
          </PermissionGate>

          <PermissionGate permission={Permission.SKILL_ASSIGN}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSkillTarget(user);
              }}
            >
              Skills
            </Button>
          </PermissionGate>

          <PermissionGate permission={Permission.WORKLOAD_VIEW}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setWloadTarget(user);
              }}
            >
              Workload
            </Button>
          </PermissionGate>

          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(user);
              }}
              style={{
                color: user.isActive
                  ? 'var(--color-danger)'
                  : 'var(--color-success)',
              }}
            >
              {user.isActive
                ? 'Deactivate'
                : 'Activate'}
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
            {data?.total ?? 0} {activeTab === 'internal' ? 'internal staff' : 'client users'}
          </p>
        </div>
        <PermissionGate permission={Permission.MEMBER_INVITE}>
          <Button icon={<Icon icon={Plus} size="sm" />} onClick={() => setShowInvite(true)}>
            Add {activeTab === 'internal' ? 'Staff' : 'Client User'}
          </Button>
        </PermissionGate>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.25rem' }}>
        {(['internal', 'clients'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              padding: '0.625rem 1.25rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: activeTab === tab ? 600 : 400,
              background: 'none',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab === 'internal' ? 'Internal Staff' : 'Client Users'}
          </button>
        ))}
      </div>

      {/* Scoring Weights Panel — internal tab only, ADMIN only */}
      {activeTab === 'internal' && perms.canConfigureScoring() && (
        <ScoringWeightsPanel />
      )}

      {/* Workload Summary Bar */}
      {activeTab === 'internal' && workloadStats && (
        <div style={{ marginBottom: '1rem' }}>
          <MetricGrid density="compact">
            <MetricCard
              title="Total agents"
              value={workloadStats.totalAgents}
              variant="brand"
              icon={<Icon icon={Users} />}
              state="ready"
            />
            <MetricCard
              title="Available"
              value={workloadStats.availableAgents}
              variant="success"
              icon={<Icon icon={UserCheck} />}
              state="ready"
            />
            <MetricCard
              title="Busy"
              value={workloadStats.busyAgents}
              variant="warning"
              icon={<Icon icon={UserX} />}
              state="ready"
            />
            <MetricCard
              title="Avg utilization"
              value={`${Math.round(workloadStats.avgUtilization)}%`}
              variant="info"
              icon={<Icon icon={BarChart3} />}
              state="ready"
            />
          </MetricGrid>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${activeTab === 'internal' ? 'staff' : 'client users'}…`} />
        </div>
        <div style={{ width: '10rem' }}>
          <Select
            options={roleFilterOptions}
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
        {activeTab === 'internal' && (
          <div style={{ width: '10rem' }}>
            <Select
              options={[{ value: '', label: 'All Sub-Roles' }, ...SUB_ROLE_OPTIONS]}
              value={subRoleFilter}
              onChange={e => setSubRoleFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Internal Staff Table ─────────────────────────────────────────── */}
      {activeTab === 'internal' && (
        <>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading users…</div>
          ) : (
            // <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <DataTable
              columns={columns}
              data={(data?.data ?? [])
                .filter((u) => internalRoles.includes(u.role))
                .filter(
                  (u) =>
                    !subRoleFilter ||
                    u.internal_sub_role === subRoleFilter
                )}
              keyExtractor={(u) => u.id}
              loading={isLoading}
              emptyMessage="No internal staff found"
              onRowClick={(user) => { }}
            />
            // </div>
          )}
        </>
      )}

      {/* ── Client Users — Org-grouped cards ─────────────────────────────── */}
      {activeTab === 'clients' && (
        <>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading users…</div>
          ) : Object.keys(clientsByOrg).length === 0 ? (
            <EmptyState title="No client users found" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(clientsByOrg).map(([org, users]) => (
                <Card hover key={org} style={{
                  background: 'var(--color-bg-surface)', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '0.75rem 1rem', background: 'var(--color-bg-subtle)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{org}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{users.length} user{users.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.75rem', padding: '0.75rem' }}>
                    {users.map(user => (
                      <Card hover key={user.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        <Avatar name={user.displayName ?? 'Unknown'} src={user.avatarUrl} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.displayName ?? 'Unknown'}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email}
                          </div>
                          <div style={{ marginTop: '0.25rem' }}>
                            <Badge color={ROLE_COLORS[user.role]} bgColor={`${ROLE_COLORS[user.role]}22`}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </div>
                        </div>
                        <PermissionGate permission={Permission.MEMBER_MANAGE}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <Button variant="ghost" size="sm" onClick={() => setEditTarget(user)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setPermTarget(user)}>Perms</Button>
                          </div>
                        </PermissionGate>
                      </Card>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {data  && (
        <div style={{ marginTop: '1rem' }}>
          <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />
      )}
      {permTarget && (
        <PermissionModal user={permTarget} onClose={() => setPermTarget(null)} />
      )}
      {skillTarget && (
        <SkillsModal
          user={skillTarget}
          allSkills={allSkills}
          onClose={() => setSkillTarget(null)}
        />
      )}
      {wloadTarget && (
        <WorkloadModal user={wloadTarget} onClose={() => setWloadTarget(null)} />
      )}
      {showInvite && (
        <InviteModal tab={activeTab} onClose={() => setShowInvite(false)} onInvited={refetch} />
      )}
    </div>
  );
};
