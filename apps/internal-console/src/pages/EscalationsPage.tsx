import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Button, Card, Avatar, ConfirmDialog, Skeleton, useToast, PermissionGate } from '@3sc/ui';
import { Permission, TicketPriority, SLAState } from '@3sc/types';
import type { EscalatedTicket } from '@3sc/types';
import {
  useGetEscalationsQuery,
  useGetEscalationAgentsQuery,
  useAssignEscalationMutation,
  useResolveEscalationMutation,
} from '@3sc/api';

// ── Helpers ───────────────────────────────────────────────────────

function formatTimeInEscalation(minutes: number): { label: string; level: 'critical' | 'warning' | 'ok' } {
  if (minutes >= 240) {
    return { label: `${Math.floor(minutes / 60)}h ${minutes % 60}m`, level: 'critical' };
  }
  if (minutes >= 60) {
    return { label: `${Math.floor(minutes / 60)}h ${minutes % 60}m`, level: 'warning' };
  }
  return { label: `${minutes}m`, level: 'ok' };
}

function severityLabel(priority: TicketPriority): string {
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
  if (priority === TicketPriority.HIGH)     return { bg: '#fffbeb', color: '#d97706' };
  if (priority === TicketPriority.MEDIUM)   return { bg: '#f0fdf4', color: '#15803d' };
  return { bg: '#f8fafc', color: '#64748b' };
}

function clientColors(clientName: string): { bg: string; color: string } {
  const palette: Array<{ bg: string; color: string }> = [
    { bg: '#eff6ff', color: '#1d4ed8' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#f0fdf4', color: '#166534' },
    { bg: '#fdf4ff', color: '#7e22ce' },
  ];
  if (!clientName) return palette[0];
  return palette[clientName.charCodeAt(clientName.length - 1) % palette.length];
}

// ── Live ticking timer ────────────────────────────────────────────

const LiveTimer: React.FC<{ initialMinutes: number; level: 'critical' | 'warning' | 'ok' }> = ({ initialMinutes, level }) => {
  const [minutes, setMinutes] = useState(initialMinutes);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setMinutes(m => m + 1), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const { label } = formatTimeInEscalation(minutes);
  const color = level === 'critical' ? '#dc2626' : level === 'warning' ? '#d97706' : '#64748b';

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, animation: level === 'critical' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined }} />
      {label}
    </span>
  );
};

// ── Assign dropdown ───────────────────────────────────────────────

interface Agent { id: string; displayName: string; currentLoad: number; }

interface AssignDropdownProps {
  ticketId: string;
  currentAssigneeId?: string;
  agents: Agent[];
  onAssign: (ticketId: string, agentId: string) => void;
}

const AssignDropdown: React.FC<AssignDropdownProps> = ({ ticketId, currentAssigneeId, agents, onAssign }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentAssigneeId ?? '');
  const [flipUp, setFlipUp] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (open && dropRef.current && menuRef.current) {
      const rect = dropRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        setFlipUp(true);
      } else {
        setFlipUp(false);
      }
    }
  }, [open]);

  return (
    <div ref={dropRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.375rem 0.625rem',
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
          fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        {agents.find(a => a.id === selected)?.displayName ?? 'Assign...'}
        <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div ref={menuRef} style={{
          position: 'absolute',
          ...(flipUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
          right: 0, zIndex: 200,
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          minWidth: '14rem', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.375rem 0.625rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Available Agents
          </div>
          {agents.map(agent => (
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
                <Avatar name={agent.displayName ?? 'Unknown'} size={22} />
                <span style={{ fontWeight: 500 }}>{agent.displayName ?? 'Unknown'}</span>
              </div>
              <span style={{
                fontSize: '0.6875rem', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)',
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

  const { data: remoteEscalations = [], isLoading } = useGetEscalationsQuery();
  const { data: agents = [] } = useGetEscalationAgentsQuery();
  const [assignEscalation] = useAssignEscalationMutation();
  const [resolveEscalation] = useResolveEscalationMutation();

  // Local optimistic state on top of server data
  const [overrides, setOverrides] = useState<Record<string, Partial<EscalatedTicket>>>({});
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [batchAssignConfirm, setBatchAssignConfirm] = useState(false);

  const escalations: EscalatedTicket[] = remoteEscalations
    .filter(e => !resolved.has(e.ticketId))
    .map(e => ({ ...e, ...overrides[e.ticketId] }));

  const unassignedCount = escalations.filter(e => !e.assignedTo).length;
  const breachedCount   = escalations.filter(e => e.slaState === SLAState.BREACHED).length;

  const filtered = escalations
    .filter(e => severityFilter === 'ALL' || e.severity === severityFilter)
    .filter(e => {
      if (assignedFilter === 'ALL') return true;
      if (assignedFilter === 'UNASSIGNED') return !e.assignedTo;
      return e.assignedTo === assignedFilter;
    });

  const handleAssign = async (ticketId: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setOverrides(prev => ({ ...prev, [ticketId]: { assignedTo: agentId, assigneeName: agent?.displayName } }));
    try {
      await assignEscalation({ ticketId, agentId }).unwrap();
      toast(`Ticket assigned to ${agent?.displayName}`, 'success');
    } catch {
      setOverrides(prev => { const next = { ...prev }; delete next[ticketId]; return next; });
      toast('Failed to assign ticket', 'error');
    }
  };

  const handleResolve = async (ticketId: string) => {
    setResolved(prev => new Set(prev).add(ticketId));
    setResolveTarget(null);
    try {
      await resolveEscalation({ ticketId }).unwrap();
      toast('Escalation resolved', 'success');
    } catch {
      setResolved(prev => { const next = new Set(prev); next.delete(ticketId); return next; });
      toast('Failed to resolve escalation', 'error');
    }
  };

  const handleAssignAll = async () => {
    const sortedAgents = [...agents].sort((a, b) => a.currentLoad - b.currentLoad);
    const unassigned = escalations.filter(e => !e.assignedTo);
    for (let i = 0; i < unassigned.length; i++) {
      const agent = sortedAgents[i % sortedAgents.length];
      await handleAssign(unassigned[i].ticketId, agent.id);
    }
    setBatchAssignConfirm(false);
    toast(`${unassigned.length} escalations auto-assigned`, 'success');
  };

  const canAssign  = permissions.has(Permission.TICKET_ASSIGN);
  const canResolve = permissions.has(Permission.TICKET_STATUS_CHANGE);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height="3.5rem" />)}
      </div>
    );
  }

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
            <Button variant="primary" size="sm" onClick={() => setBatchAssignConfirm(true)}>
              Assign all ({unassignedCount})
            </Button>
          )}
        </PermissionGate>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total',      value: escalations.length,                                                   color: 'var(--color-text)' },
          { label: 'Unassigned', value: unassignedCount,                                                      color: unassignedCount > 0 ? '#dc2626' : 'var(--color-success)' },
          { label: 'Breached',   value: breachedCount,                                                        color: breachedCount > 0 ? '#dc2626' : 'var(--color-success)' },
          { label: 'At Risk',    value: escalations.filter(e => e.slaState === SLAState.AT_RISK).length,      color: '#d97706' },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{m.label}</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 700, color: m.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {unassignedCount > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#92400e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span>
          <span>{unassignedCount === 1 ? '1 escalated ticket is unassigned. Assign immediately to meet SLA.' : `${unassignedCount} escalated tickets are unassigned. Assign immediately to meet SLA.`}</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filter:</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)} style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: severityFilter === s ? 'var(--color-brand-500)' : 'var(--color-border)', background: severityFilter === s ? 'var(--color-brand-500)' : 'var(--color-bg)', color: severityFilter === s ? '#fff' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>
              {s === 'ALL' ? 'All' : s === 'CRITICAL' ? 'S1' : s === 'HIGH' ? 'S2' : 'S3'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ value: 'ALL', label: 'All' }, { value: 'UNASSIGNED', label: 'Unassigned' }].map(f => (
            <button key={f.value} onClick={() => setAssignedFilter(f.value)} style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: assignedFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-border)', background: assignedFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-bg)', color: assignedFilter === f.value ? '#fff' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {filtered.length} of {escalations.length} escalations
        </span>
      </div>

      {/* Table */}
      <Card style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1.1fr 1.4fr 1.1fr 1.5fr', gap: '0.75rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          {['Ticket', 'Client', 'Severity', 'Escalated By', 'Reason', 'Time in Escalation', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>No escalations found</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>All tickets are on track. Check back later.</p>
          </div>
        ) : (
          filtered.map((escalation: EscalatedTicket, idx: number) => {
            const time = formatTimeInEscalation(escalation.timeInEscalationMinutes);
            const sevColors = severityColors(escalation.severity);
            const cliColors = clientColors(escalation.clientName);

            return (
              <div
                key={escalation.ticketId}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1.1fr 1.4fr 1.1fr 1.5fr', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--color-border)', borderRadius: idx === filtered.length - 1 ? '0 0 var(--radius-lg) var(--radius-lg)' : undefined, alignItems: 'center', transition: 'background var(--transition-fast)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                {/* Ticket */}
                <div>
                  <button onClick={() => navigate(`/tickets/${(escalation as any)._ticketId ?? escalation.ticketId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.125rem' }}>{escalation.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{escalation.ticketNumber}</div>
                  </button>
                </div>

                {/* Client */}
                <div>
                  <span style={{ padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, background: cliColors.bg, color: cliColors.color }}>
                    {escalation.clientName}
                  </span>
                </div>

                {/* Severity */}
                <div>
                  <span style={{ padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: sevColors.bg, color: sevColors.color }}>
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
                    <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontStyle: 'italic' }}>System</span>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{escalation.reason}</span>
                </div>

                {/* Time */}
                <div>
                  <LiveTimer initialMinutes={escalation.timeInEscalationMinutes} level={time.level} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
                  {canAssign && (
                    <AssignDropdown
                      ticketId={escalation.ticketId}
                      currentAssigneeId={escalation.assignedTo}
                      agents={agents}
                      onAssign={handleAssign}
                    />
                  )}
                  {canResolve && (
                    <button
                      onClick={() => setResolveTarget(escalation.ticketId)}
                      style={{ padding: '0.375rem 0.625rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#15803d', whiteSpace: 'nowrap' }}
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
        isOpen={resolveTarget !== null}
        onClose={() => setResolveTarget(null)}
        title="Resolve Escalation"
        message="Mark this escalation as resolved? This will change the ticket status to Resolved and remove it from the escalation queue."
        confirmLabel="Resolve"
        cancelLabel="Cancel"
        onConfirm={() => { if (resolveTarget) handleResolve(resolveTarget); }}
        variant="primary"
      />

      {/* Batch assign confirmation */}
      <ConfirmDialog
        isOpen={batchAssignConfirm}
        onClose={() => setBatchAssignConfirm(false)}
        title="Auto-Assign All Unassigned"
        message={`Auto-assign all ${unassignedCount} unassigned escalations to available agents based on current workload?`}
        confirmLabel="Assign All"
        cancelLabel="Cancel"
        onConfirm={handleAssignAll}
        variant="primary"
      />
    </div>
  );
};
