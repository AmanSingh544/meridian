import React, { useState, useRef } from 'react';
import {
  useGetRoutingRulesQuery,
  useCreateRoutingRuleMutation,
  useUpdateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  useGetEscalationAgentsQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Button, Select, Skeleton, useToast, PermissionGate, ConfirmDialog, Card } from '@3sc/ui';
import { Permission, TicketPriority, TicketCategory } from '@3sc/types';
import type { RoutingRule, RoutingCondition } from '@3sc/types';

// ── Local types ───────────────────────────────────────────────────
// The API RoutingCondition value is string | string[]. Internally we work with
// a comma-separated string so it's easy to pass to <input>/<Select>.

type ConditionField = 'priority' | 'category' | 'organization_id' | 'tags' | 'keyword';
type ConditionOperator = 'equals' | 'contains' | 'in' | 'not_in';

interface LocalCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string; // comma-separated if 'in' / 'not_in'
}

// ── Helpers ───────────────────────────────────────────────────────

const FIELD_OPTIONS: Array<{ value: ConditionField; label: string }> = [
  { value: 'priority', label: 'Priority' },
  { value: 'category', label: 'Category' },
  { value: 'organization_id', label: 'Client / Org' },
  { value: 'tags', label: 'Tags (contains)' },
  { value: 'keyword', label: 'Keyword (title/desc)' },
];

const OPERATOR_OPTIONS: Record<ConditionField, Array<{ value: ConditionOperator; label: string }>> = {
  priority: [
    { value: 'equals', label: 'is' },
    { value: 'in', label: 'is any of' },
    { value: 'not_in', label: 'is not' },
  ],
  category: [
    { value: 'equals', label: 'is' },
    { value: 'in', label: 'is any of' },
    { value: 'not_in', label: 'is not' },
  ],
  organization_id: [
    { value: 'equals', label: 'is' },
    { value: 'in', label: 'is any of' },
  ],
  tags: [{ value: 'contains', label: 'contains' }],
  keyword: [{ value: 'contains', label: 'contains' }],
};

const VALUE_OPTIONS: Partial<Record<ConditionField, Array<{ value: string; label: string }>>> = {
  priority: Object.values(TicketPriority).map(v => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() })),
  category: Object.values(TicketCategory).map(v => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ') })),
};

const FIELD_ALIAS: Record<string, ConditionField> = {
  organizationId: 'organization_id',
  organization_id: 'organization_id',
};
const SUPPORTED_FIELDS = new Set<string>(['priority', 'category', 'organization_id', 'tags', 'keyword']);

function conditionToLocal(c: RoutingCondition): LocalCondition {
  if (!c || typeof c !== 'object') {
    return { field: 'priority', operator: 'equals', value: 'CRITICAL' };
  }
  const rawField = c.field as string;
  const field: ConditionField = FIELD_ALIAS[rawField] ?? (SUPPORTED_FIELDS.has(rawField) ? rawField as ConditionField : 'priority');
  const defaultOp = OPERATOR_OPTIONS[field][0].value;
  return {
    field,
    operator: (c.operator as ConditionOperator) || defaultOp,
    value: Array.isArray(c.value) ? c.value.join(',') : (c.value ?? ''),
  };
}

function localToCondition(c: LocalCondition): RoutingCondition {
  const isMulti = c.operator === 'in' || c.operator === 'not_in';
  return {
    field: c.field,
    operator: c.operator,
    value: isMulti ? c.value.split(',').map(s => s.trim()).filter(Boolean) : c.value,
  };
}

function conditionSummary(c: RoutingCondition): string {
  if (!c || typeof c !== 'object') return 'Invalid condition';
  const fieldLabel = FIELD_OPTIONS.find(f => f.value === c.field)?.label ?? c.field ?? '?';
  const opLabel = OPERATOR_OPTIONS[(c.field as ConditionField) || 'priority']?.find(o => o.value === c.operator)?.label ?? c.operator ?? '?';
  const val = Array.isArray(c.value) ? c.value.join(', ') : (c.value ?? '?');
  return `${fieldLabel} ${opLabel} ${val}`;
}

// ── Toggle ────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    role="switch" aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '2.5rem', height: '1.375rem', borderRadius: '999px',
      background: checked ? 'var(--color-brand-500)' : 'var(--color-border)',
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative', transition: 'background var(--transition-fast)',
      flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}
  >
    <span style={{
      position: 'absolute', top: '0.125rem',
      left: checked ? 'calc(100% - 1.25rem)' : '0.125rem',
      width: '1.125rem', height: '1.125rem',
      borderRadius: '50%', background: '#fff',
      transition: 'left var(--transition-fast)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
);

// ── Rule Form ─────────────────────────────────────────────────────

interface RuleFormProps {
  rule?: RoutingRule;
  agents: { id: string; displayName: string }[];
  onSave: (data: Omit<RoutingRule, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  saving: boolean;
}

const RuleForm: React.FC<RuleFormProps> = ({ rule, agents, onSave, onCancel, saving }) => {
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [assignTo, setAssignTo] = useState(rule?.assignTo ?? '');
  const [conditions, setConditions] = useState<LocalCondition[]>(
    rule?.conditions.length
      ? rule.conditions.map(conditionToLocal)
      : [{ field: 'priority', operator: 'equals', value: 'CRITICAL' }]
  );
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [priority] = useState(rule?.priority ?? 99);

  const addCondition = () => {
    if (conditions.length >= 10) return;
    setConditions(prev => [...prev, { field: 'priority', operator: 'equals', value: 'CRITICAL' }]);
  };

  const removeCondition = (idx: number) => setConditions(prev => prev.filter((_, i) => i !== idx));

  const updateCondition = (idx: number, patch: Partial<LocalCondition>) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const valid = name.trim().length > 0 && assignTo.length > 0 && conditions.length > 0;

  const handleSave = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      assignTo,
      conditions: conditions.map(localToCondition),
      isActive,
      priority,
    });
  };

  return (
    <div style={{
      background: 'var(--color-bg)', border: '1px solid var(--color-brand-500)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      boxShadow: '0 4px 24px rgba(99,102,241,0.1)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Rule Name *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Critical to Senior SPOC"
            style={{
              width: '100%', padding: '0.5rem 0.625rem',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg)', color: 'var(--color-text)',
              fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <Select
            label="Assign To *"
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            placeholder="Select agent..."
            options={agents.map(a => ({ value: a.id, label: a.displayName }))}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
          Description (optional)
        </label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does this rule do?"
          style={{
            width: '100%', padding: '0.5rem 0.625rem',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Conditions */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conditions * ({conditions.length}/10)
          </label>
          {conditions.length < 10 && (
            <button
              onClick={addCondition}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-brand-500)', fontWeight: 600, padding: 0 }}
            >
              + Add condition
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conditions.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', minWidth: '1.5rem', textAlign: 'center' }}>
                {idx === 0 ? 'IF' : 'AND'}
              </span>

              <Select
                value={c.field}
                onChange={e => updateCondition(idx, { field: e.target.value as ConditionField, operator: OPERATOR_OPTIONS[e.target.value as ConditionField][0].value, value: '' })}
                options={FIELD_OPTIONS}
                style={{ fontSize: '0.8125rem' }}
              />

              <Select
                value={c.operator}
                onChange={e => updateCondition(idx, { operator: e.target.value as ConditionOperator })}
                options={OPERATOR_OPTIONS[c.field] ?? OPERATOR_OPTIONS['priority']}
                style={{ fontSize: '0.8125rem' }}
              />

              {VALUE_OPTIONS[c.field] ? (
                <Select
                  value={c.value}
                  onChange={e => updateCondition(idx, { value: e.target.value })}
                  placeholder="Select..."
                  options={VALUE_OPTIONS[c.field]!}
                  style={{ flex: 1, fontSize: '0.8125rem' }}
                />
              ) : (
                <input
                  value={c.value}
                  onChange={e => updateCondition(idx, { value: e.target.value })}
                  placeholder={c.field === 'tags' ? 'e.g. urgent' : 'Enter value...'}
                  style={{ flex: 1, padding: '0.3125rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8125rem', outline: 'none' }}
                />
              )}

              {conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.875rem', padding: '0.125rem', lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Toggle checked={isActive} onChange={setIsActive} />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!valid} loading={saving}>
            Save rule
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Simulate panel ────────────────────────────────────────────────

const SimulatePanel: React.FC<{ rules: RoutingRule[]; agents: { id: string; displayName: string }[]; onClose: () => void }> = ({ rules, agents, onClose }) => {
  const [priority, setPriority] = useState('CRITICAL');
  const [category, setCategory] = useState('BUG');
  const [keyword, setKeyword] = useState('');
  const [orgId, setOrgId] = useState('');
  const [tags, setTags] = useState('');
  const [result, setResult] = useState<{ matched: RoutingRule | null; evaluated: Array<{ rule: RoutingRule; matched: boolean }> } | null>(null);

  const matchCondition = (c: RoutingCondition): boolean => {
    const condValues = (Array.isArray(c.value) ? c.value : [c.value]).map(v => String(v ?? '').toUpperCase());

    switch (c.field) {
      case 'priority': {
        const ticketPriority = priority.toUpperCase();
        if (c.operator === 'equals') return condValues[0] === ticketPriority;
        if (c.operator === 'in') return condValues.includes(ticketPriority);
        if (c.operator === 'not_in') return !condValues.includes(ticketPriority);
        return false;
      }
      case 'category': {
        const ticketCategory = category.toUpperCase();
        if (c.operator === 'equals') return condValues[0] === ticketCategory;
        if (c.operator === 'in') return condValues.includes(ticketCategory);
        if (c.operator === 'not_in') return !condValues.includes(ticketCategory);
        return false;
      }
      case 'organization_id': {
        if (!orgId) return false;
        const ticketOrg = orgId.toUpperCase();
        if (c.operator === 'equals') return condValues[0] === ticketOrg;
        if (c.operator === 'in') return condValues.includes(ticketOrg);
        return false;
      }
      case 'tags': {
        if (c.operator !== 'contains') return false;
        const needle = String(c.value ?? '').toLowerCase();
        return tags.split(',').map(t => t.trim().toLowerCase()).includes(needle);
      }
      case 'keyword': {
        if (c.operator !== 'contains') return false;
        return keyword.toLowerCase().includes(String(c.value ?? '').toLowerCase());
      }
      default:
        return false;
    }
  };

  const simulate = () => {
    const evaluated = rules.filter(r => r.isActive).map(r => {
      const matched = r.conditions.length > 0 && r.conditions.every(matchCondition);
      return { rule: r, matched };
    });
    const first = evaluated.find(e => e.matched);
    setResult({ matched: first?.rule ?? null, evaluated });
  };

  const agentName = (id: string) => agents.find(a => a.id === id)?.displayName ?? id;

  return (
    <div style={{
      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-display)' }}>Rule Simulator</p>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Test which rule would match a hypothetical ticket
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem' }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
        <div>
          <Select
            label="Priority"
            value={priority}
            onChange={e => setPriority(e.target.value)}
            options={Object.values(TicketPriority).map(v => ({ value: v, label: v }))}
          />
        </div>
        <div>
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={Object.values(TicketCategory).map(v => ({ value: v, label: v }))}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Keyword (optional)</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. API timeout" style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. urgent,api" style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <Button size="sm" onClick={simulate}>Simulate</Button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Client / Org ID (optional)</label>
        <input value={orgId} onChange={e => setOrgId(e.target.value)} placeholder="e.g. org_abc123" style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {result && (
        <div>
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem',
            background: result.matched ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.matched ? '#86efac' : '#fca5a5'}`,
            fontSize: '0.875rem', fontWeight: 600,
            color: result.matched ? '#15803d' : '#dc2626',
          }}>
            {result.matched
              ? `✓ Matched: "${result.matched.name}" → assigned to ${agentName(result.matched.assignTo)}`
              : '✕ No matching rule — ticket would be unassigned'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {result.evaluated.map(e => (
              <div key={e.rule.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-subtle)', fontSize: '0.8125rem',
              }}>
                <span style={{ fontSize: '0.75rem', color: e.matched ? '#15803d' : 'var(--color-text-muted)', fontWeight: 700, minWidth: '1rem' }}>
                  {e.matched ? '✓' : '✕'}
                </span>
                <span style={{ fontWeight: e.matched ? 600 : 400, color: e.matched ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  #{e.rule.priority} {e.rule.name}
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            First matching rule wins. Rules evaluated in priority order.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────

export const RoutingRulesPage: React.FC = () => {
  useDocumentTitle('Routing Rules');
  const permissions = usePermissions();
  const { toast } = useToast();

  const canEdit = permissions.has(Permission.ESCALATION_CONFIGURE);

  const { data: rules = [], isLoading: rulesLoading } = useGetRoutingRulesQuery();
  const { data: agents = [] } = useGetEscalationAgentsQuery();
  const [createRule, { isLoading: creating }] = useCreateRoutingRuleMutation();
  const [updateRule, { isLoading: updating }] = useUpdateRoutingRuleMutation();
  const [deleteRule] = useDeleteRoutingRuleMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const dragIdx = useRef<number | null>(null);

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };

  const handleDrop = async (toIdx: number) => {
    if (dragIdx.current === null || dragIdx.current === toIdx) return;
    const reordered = [...sortedRules];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(toIdx, 0, moved);
    dragIdx.current = null;
    // Persist new priorities
    await Promise.all(
      reordered.map((r, i) => {
        if (r.priority !== i + 1) {
          return updateRule({ id: r.id, payload: { priority: i + 1 } });
        }
      })
    );
    toast('Rule priority updated', 'success');
  };

  const handleCreate = async (data: Omit<RoutingRule, 'id' | 'created_at'>) => {
    try {
      await createRule({ ...data, priority: sortedRules.length + 1 }).unwrap();
      setCreatingNew(false);
      toast('Routing rule created', 'success');
    } catch {
      toast('Failed to create rule', 'error');
    }
  };

  const handleUpdate = async (id: string, data: Omit<RoutingRule, 'id' | 'created_at'>) => {
    try {
      await updateRule({ id, payload: data }).unwrap();
      setEditingId(null);
      toast('Routing rule saved', 'success');
    } catch {
      toast('Failed to save rule', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id).unwrap();
      setDeleteTarget(null);
      toast('Routing rule deleted', 'success');
    } catch {
      toast('Failed to delete rule', 'error');
    }
  };

  const handleToggleActive = async (rule: RoutingRule) => {
    try {
      await updateRule({ id: rule.id, payload: { isActive: !rule.isActive } }).unwrap();
    } catch {
      toast('Failed to update rule', 'error');
    }
  };

  if (rulesLoading) {
    return (
      <div>
        <Skeleton height="2rem" style={{ marginBottom: '1rem', width: '12rem' }} />
        {[1, 2, 3].map(i => <Skeleton key={i} height="4.5rem" style={{ marginBottom: '0.5rem' }} />)}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Routing Rules
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Define which agent receives a ticket based on its properties. Rules evaluate in priority order — first match wins.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowSimulator(!showSimulator)}>
            {showSimulator ? 'Hide' : '▶'} Simulator
          </Button>
          <PermissionGate permission={Permission.ESCALATION_CONFIGURE}>
            <Button variant="primary" size="sm" onClick={() => { setCreatingNew(true); setEditingId(null); }}>
              + New rule
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Simulator */}
      {showSimulator && (
        <SimulatePanel
          rules={sortedRules}
          agents={agents}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* New rule form */}
      {creatingNew && (
        <div style={{ marginBottom: '1rem' }}>
          <RuleForm
            agents={agents}
            onSave={handleCreate}
            onCancel={() => setCreatingNew(false)}
            saving={creating}
          />
        </div>
      )}

      {/* Rules list */}
      {sortedRules.length === 0 && !creatingNew ? (
        <div style={{
          textAlign: 'center', padding: '3rem', background: 'var(--color-bg)',
          border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔀</div>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>No routing rules yet</p>
          <p style={{ margin: '0.25rem 0 0.875rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Without rules, tickets are not auto-assigned — agents must pick them up manually.
          </p>
          <PermissionGate permission={Permission.ESCALATION_CONFIGURE}>
            <Button size="sm" onClick={() => setCreatingNew(true)}>Create first rule</Button>
          </PermissionGate>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sortedRules.map((rule, idx) => {
            const isEditing = editingId === rule.id;
            const agentName = agents.find(a => a.id === rule.assignTo)?.displayName ?? rule.assignTo;
            return (
              <div key={rule.id}>
                {isEditing ? (
                  <RuleForm
                    rule={rule}
                    agents={agents}
                    onSave={data => handleUpdate(rule.id, data)}
                    onCancel={() => setEditingId(null)}
                    saving={updating}
                  />
                ) : (
                  <div
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e: React.DragEvent) => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    style={{ opacity: rule.isActive ? 1 : 0.55 }}
                  >
                    <Card
                      hover
                      style={{
                        cursor: canEdit ? 'grab' : 'default',
                      }}
                    >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', flexShrink: 0 }}>
                          {canEdit && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>⠿</span>}
                          <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '1.5rem', height: '1.5rem', borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {rule.priority}
                          </span>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>{rule.name}</span>
                            {!rule.isActive && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                                INACTIVE
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{rule.description}</p>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                            {rule.conditions.map((c, ci) => (
                              <React.Fragment key={ci}>
                                {ci > 0 && <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', alignSelf: 'center' }}>AND</span>}
                                <span style={{
                                  padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)',
                                  background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                                  fontSize: '0.75rem', color: 'var(--color-text-secondary)',
                                }}>
                                  {conditionSummary(c)}
                                </span>
                              </React.Fragment>
                            ))}
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>→</span>
                            <span style={{
                              padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)',
                              background: '#eff6ff', border: '1px solid #bfdbfe',
                              fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8',
                            }}>
                              {agentName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <Toggle checked={rule.isActive} onChange={() => handleToggleActive(rule)} disabled={!canEdit} />
                        <PermissionGate permission={Permission.ESCALATION_CONFIGURE}>
                          <button
                            onClick={() => { setEditingId(rule.id); setCreatingNew(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: '0.25rem 0.375rem', borderRadius: 'var(--radius-sm)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(rule.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.8125rem', padding: '0.25rem 0.375rem', borderRadius: 'var(--radius-sm)' }}
                          >
                            Delete
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </Card>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sortedRules.length > 0 && !creatingNew && (
        <div style={{
          marginTop: '0.75rem', padding: '0.625rem 0.875rem',
          background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {canEdit
            ? <span>⠿ Drag rules to reorder priority. Rule #1 is evaluated first.</span>
            : <span>Rules are evaluated in priority order. Rule #1 is evaluated first.</span>}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Routing Rule"
        message={`Delete "${sortedRules.find(r => r.id === deleteTarget)?.name}"? This action cannot be undone. Tickets that would have matched this rule will remain unassigned.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
};
