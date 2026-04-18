import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle, usePermissions, useSession } from '@3sc/hooks';
import { Button, Card, Badge, Avatar, Select, ConfirmDialog, ErrorState, Skeleton, useToast, PermissionGate } from '@3sc/ui';
import { Permission, TicketPriority, SLAState } from '@3sc/types';

// ── Mock data — replace with RTK Query hooks when API is wired ────
const MOCK_ESCALATIONS = [
  {
    ticketId: 'uuid-001', ticketNumber: 'TKT-004', title: 'Calendar Save Fails',
    clientName: 'Client 2', clientId: 'c2', severity: TicketPriority.CRITICAL,
    escalatedBy: 'Nikita K.', escalatedByUserId: 'u1',
    reason: 'SLA breach imminent', timeInEscalationMinutes: 102,
    assignedTo: null, assigneeName: null, slaState: SLAState.AT_RISK,
    created_at: '2026-04-17T08:30:00Z',
  },
  {
    ticketId: 'uuid-002', ticketNumber: 'TKT-012', title: 'API timeout on bulk ops',
    clientName: 'Client 1', clientId: 'c1', severity: TicketPriority.CRITICAL,
    escalatedBy: 'Ravi M.', escalatedByUserId: 'u2',
    reason: 'Customer impact on prod', timeInEscalationMinutes: 190,
    assignedTo: 'u3', assigneeName: 'Priya S.', slaState: SLAState.BREACHED,
    created_at: '2026-04-17T06:00:00Z',
  },
  {
    ticketId: 'uuid-003', ticketNumber: 'TKT-021', title: 'Data sync drops rows',
    clientName: 'Client 3', clientId: 'c3', severity: TicketPriority.HIGH,
    escalatedBy: 'Priya S.', escalatedByUserId: 'u3',
    reason: 'Data integrity risk', timeInEscalationMinutes: 355,
    assignedTo: 'u2', assigneeName: 'Ravi M.', slaState: SLAState.AT_RISK,
    created_at: '2026-04-17T04:05:00Z',
  },
  {
    ticketId: 'uuid-004', ticketNumber: 'TKT-026', title: 'Workflow freeze on approve',
    clientName: 'Client 2', clientId: 'c2', severity: TicketPriority.HIGH,
    escalatedBy: null, escalatedByUserId: null,
    reason: 'Blocking client workflow', timeInEscalationMinutes: 440,
    assignedTo: null, assigneeName: null, slaState: SLAState.BREACHED,
    created_at: '2026-04-17T02:30:00Z',
  },
];

const MOCK_AGENTS = [
  { id: 'u1', displayName: 'Nikita K.', currentLoad: 3 },
  { id: 'u2', displayName: 'Ravi M.', currentLoad: 4 },
  { id: 'u3', displayName: 'Priya S.', currentLoad: 2 },
  { id: 'u4', displayName: 'Arjun T.', currentLoad: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────

function formatTimeInEscalation(minutes: number): { label: string; level: 'critical' | 'warning' | 'ok' } {
  if (minutes >= 240) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { label: `${h}h ${m}m`, level: 'critical' };
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { label: `${h}h ${m}m`, level: 'warning' };
  }
  return { label: `${minutes}m`, level: 'ok' };
}

function severityLabel(priority: TicketPriority) {
  const map: Record<TicketPriority, string> = {
    [TicketPriority.CRITICAL]: 'S1',
    [TicketPriority.HIGH]: 'S2',
    [TicketPriority.MEDIUM]: 'S3',
    [TicketPriority.LOW]: 'S4',
  };
  return map[priority] ?? priority;
}

function severityColors(priority: TicketPriority): { bg: string; color: string } {
  if (priority === TicketPriority.CRITICAL) return { bg: '#fef2f2', color: '#dc2626' };
  if (priority === TicketPriority.HIGH) return { bg: '#fffbeb', color: '#d97706' };
  if (priority === TicketPriority.MEDIUM) return { bg: '#f0fdf4', color: '#15803d' };
  return { bg: '#f8fafc', color: '#64748b' };
}

function clientColors(clientName: string): { bg: string; color: string } {
  const palette: Array<{ bg: string; color: string }> = [
    { bg: '#eff6ff', color: '#1d4ed8' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#f0fdf4', color: '#166534' },
    { bg: '#fdf4ff', color: '#7e22ce' },
  ];
  const idx = clientName.charCodeAt(clientName.length - 1) % palette.length;
  return palette[idx];
}

// ── Live ticking time display ─────────────────────────────────────

const LiveTimer: React.FC<{ initialMinutes: number; level: 'critical' | 'warning' | 'ok' }> = ({ initialMinutes, level }) => {
  const [minutes, setMinutes] = useState(initialMinutes);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setMinutes((m) => m + 1);
    }, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const { label } = formatTimeInEscalation(minutes);
  const color = level === 'critical' ? '#dc2626' : level === 'warning' ? '#d97706' : '#64748b';

  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color,
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    }}>
      <span style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: color, animation: level === 'critical' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined,
      }} />
      {label}
    </span>
  );
};

// ── Assign dropdown (inline) ──────────────────────────────────────

interface AssignDropdownProps {
  ticketId: string;
  currentAssigneeId: string | null;
  onAssign: (ticketId: string, agentId: string) => void;
}

const AssignDropdown: React.FC<AssignDropdownProps> = ({ ticketId, currentAssigneeId, onAssign }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentAssigneeId ?? '');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.375rem 0.625rem',
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
          fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        {MOCK_AGENTS.find(a => a.id === selected)?.displayName ?? 'Assign...'}
        <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          minWidth: '14rem', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.375rem 0.625rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Available Agents
          </div>
          {MOCK_AGENTS.map(agent => (
            <button
              key={agent.id}
              onClick={() => { setSelected(agent.id); onAssign(ticketId, agent.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '0.5rem 0.75rem',
                background: agent.id === selected ? 'var(--color-bg-subtle)' : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: '0.8125rem', color: 'var(--color-text)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = agent.id === selected ? 'var(--color-bg-subtle)' : 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Avatar name={agent.displayName} size={22} />
                <span style={{ fontWeight: 500 }}>{agent.displayName}</span>
              </div>
              <span style={{
                fontSize: '0.6875rem', padding: '0.125rem 0.375rem',
                borderRadius: 'var(--radius-sm)',
                background: agent.currentLoad <= 2 ? '#f0fdf4' : agent.currentLoad <= 4 ? '#fffbeb' : '#fef2f2',
                color: agent.currentLoad <= 2 ? '#15803d' : agent.currentLoad <= 4 ? '#92400e' : '#dc2626',
              }}>
                {agent.currentLoad} active
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────

export const EscalationsPage: React.FC = () => {
  useDocumentTitle('Escalations');
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { toast } = useToast();

  const [escalations, setEscalations] = useState(MOCK_ESCALATIONS);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [batchAssignConfirm, setBatchAssignConfirm] = useState(false);

  const unassignedCount = escalations.filter(e => !e.assignedTo).length;
  const breachedCount = escalations.filter(e => e.slaState === SLAState.BREACHED).length;

  const filtered = escalations
    .filter(e => severityFilter === 'ALL' || e.severity === severityFilter)
    .filter(e => {
      if (assignedFilter === 'ALL') return true;
      if (assignedFilter === 'UNASSIGNED') return !e.assignedTo;
      return e.assignedTo === assignedFilter;
    });

  const handleAssign = (ticketId: string, agentId: string) => {
    const agent = MOCK_AGENTS.find(a => a.id === agentId);
    setEscalations(prev => prev.map(e =>
      e.ticketId === ticketId ? { ...e, assignedTo: agentId, assigneeName: agent?.displayName ?? null } : e
    ));
    toast(`Ticket assigned to ${agent?.displayName}`, 'success');
  };

  const handleResolve = (ticketId: string) => {
    setEscalations(prev => prev.filter(e => e.ticketId !== ticketId));
    setResolveTarget(null);
    toast('Escalation resolved', 'success');
  };

  const handleAssignAll = () => {
    // Auto-assign round-robin to lowest-load agent
    const sortedAgents = [...MOCK_AGENTS].sort((a, b) => a.currentLoad - b.currentLoad);
    const unassigned = escalations.filter(e => !e.assignedTo);
    const updated = [...escalations];
    unassigned.forEach((e, i) => {
      const agent = sortedAgents[i % sortedAgents.length];
      const idx = updated.findIndex(u => u.ticketId === e.ticketId);
      if (idx !== -1) updated[idx] = { ...updated[idx], assignedTo: agent.id, assigneeName: agent.displayName };
    });
    setEscalations(updated);
    setBatchAssignConfirm(false);
    toast(`${unassigned.length} escalations auto-assigned`, 'success');
  };

  const canAssign = permissions.has(Permission.TICKET_ASSIGN);
  const canResolve = permissions.has(Permission.TICKET_STATUS_CHANGE);

  return (
    <div>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Escalations
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Tickets requiring immediate attention — ordered by time in escalation
          </p>
        </div>

        <PermissionGate permission={Permission.TICKET_ASSIGN}>
          {unassignedCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setBatchAssignConfirm(true)}
            >
              Assign all ({unassignedCount})
            </Button>
          )}
        </PermissionGate>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
        gap: '0.75rem', marginBottom: '1rem',
      }}>
        {[
          { label: 'Total', value: escalations.length, color: 'var(--color-text)' },
          { label: 'Unassigned', value: unassignedCount, color: unassignedCount > 0 ? '#dc2626' : 'var(--color-success)' },
          { label: 'Breached', value: breachedCount, color: breachedCount > 0 ? '#dc2626' : 'var(--color-success)' },
          { label: 'At Risk', value: escalations.filter(e => e.slaState === SLAState.AT_RISK).length, color: '#d97706' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.875rem',
            display: 'flex', flexDirection: 'column', gap: '0.125rem',
          }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{m.label}</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 700, color: m.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Contextual alert banner */}
      {unassignedCount > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fefce8', border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
          fontSize: '0.8125rem', color: '#92400e', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⚠️</span>
          <span>
            {unassignedCount === 1
              ? '1 escalated ticket is unassigned. Assign immediately to meet SLA.'
              : `${unassignedCount} escalated tickets are unassigned. Assign immediately to meet SLA.`}
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filter:</span>

        {/* Severity filter pills */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: severityFilter === s ? 'var(--color-brand-500)' : 'var(--color-border)',
                background: severityFilter === s ? 'var(--color-brand-500)' : 'var(--color-bg)',
                color: severityFilter === s ? '#fff' : 'var(--color-text-secondary)',
                transition: 'var(--transition-fast)',
              }}
            >
              {s === 'ALL' ? 'All' : s === 'CRITICAL' ? 'S1' : s === 'HIGH' ? 'S2' : 'S3'}
            </button>
          ))}
        </div>

        {/* Assigned filter */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ value: 'ALL', label: 'All' }, { value: 'UNASSIGNED', label: 'Unassigned' }].map(f => (
            <button
              key={f.value}
              onClick={() => setAssignedFilter(f.value)}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: assignedFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-border)',
                background: assignedFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-bg)',
                color: assignedFilter === f.value ? '#fff' : 'var(--color-text-secondary)',
                transition: 'var(--transition-fast)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {filtered.length} of {escalations.length} escalations
        </span>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr 1.4fr 1.2fr 1fr',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-subtle)',
        }}>
          {['Ticket', 'Client', 'Severity', 'Escalated By', 'Reason', 'Time in Escalation', 'Actions'].map(h => (
            <span key={h} style={{
              fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--color-text-muted)',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>No escalations found</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              All tickets are on track. Check back later.
            </p>
          </div>
        ) : (
          filtered.map((escalation, idx) => {
            const time = formatTimeInEscalation(escalation.timeInEscalationMinutes);
            const sevColors = severityColors(escalation.severity);
            const cliColors = clientColors(escalation.clientName);
            const isLast = idx === filtered.length - 1;

            return (
              <div
                key={escalation.ticketId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr 1.4fr 1.2fr 1fr',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  alignItems: 'center',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                {/* Ticket */}
                <div>
                  <button
                    onClick={() => navigate(`/tickets/${escalation.ticketId}`)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.125rem' }}>
                      {escalation.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {escalation.ticketNumber}
                    </div>
                  </button>
                </div>

                {/* Client */}
                <div>
                  <span style={{
                    padding: '0.1875rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem', fontWeight: 600,
                    background: cliColors.bg, color: cliColors.color,
                  }}>
                    {escalation.clientName}
                  </span>
                </div>

                {/* Severity */}
                <div>
                  <span style={{
                    padding: '0.1875rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem', fontWeight: 700,
                    background: sevColors.bg, color: sevColors.color,
                  }}>
                    {severityLabel(escalation.severity)}
                  </span>
                </div>

                {/* Escalated by */}
                <div>
                  {escalation.escalatedBy ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                      <Avatar name={escalation.escalatedBy} size={22} />
                      <span>{escalation.escalatedBy}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {escalation.reason}
                  </span>
                </div>

                {/* Time in Escalation — live ticking */}
                <div>
                  <LiveTimer initialMinutes={escalation.timeInEscalationMinutes} level={time.level} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {canAssign && (
                    <AssignDropdown
                      ticketId={escalation.ticketId}
                      currentAssigneeId={escalation.assignedTo}
                      onAssign={handleAssign}
                    />
                  )}
                  {canResolve && (
                    <button
                      onClick={() => setResolveTarget(escalation.ticketId)}
                      style={{
                        padding: '0.375rem 0.625rem',
                        background: '#f0fdf4', border: '1px solid #86efac',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, color: '#15803d',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Resolve confirmation */}
      <ConfirmDialog
        open={resolveTarget !== null}
        title="Resolve Escalation"
        message={`Mark this escalation as resolved? This will change the ticket status to Resolved and remove it from the escalation queue.`}
        confirmLabel="Resolve"
        cancelLabel="Cancel"
        onConfirm={() => resolveTarget && handleResolve(resolveTarget)}
        onCancel={() => setResolveTarget(null)}
        variant="primary"
      />

      {/* Batch assign confirmation */}
      <ConfirmDialog
        open={batchAssignConfirm}
        title="Auto-Assign All Unassigned"
        message={`Auto-assign all ${unassignedCount} unassigned escalations to available agents based on current workload? This distributes tickets round-robin to the lowest-loaded agents.`}
        confirmLabel="Assign All"
        cancelLabel="Cancel"
        onConfirm={handleAssignAll}
        onCancel={() => setBatchAssignConfirm(false)}
        variant="primary"
      />
    </div>
  );
};
