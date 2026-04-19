import React, { useState, useRef } from 'react';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Button, Select, useToast, PermissionGate, ConfirmDialog } from '@3sc/ui';
import { Permission, TicketPriority, TicketCategory } from '@3sc/types';

// ── Types ─────────────────────────────────────────────────────────

type ConditionField = 'priority' | 'category' | 'organization_id' | 'tags' | 'keyword';
type ConditionOperator = 'equals' | 'contains' | 'in' | 'not_in';

interface RoutingCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface RoutingRule {
  id: string;
  name: string;
  description: string;
  conditions: RoutingCondition[];
  assignTo: string;
  assignToName: string;
  priority: number;
  isActive: boolean;
  matchCount: number;
}

// ── Mock data ─────────────────────────────────────────────────────

const MOCK_AGENTS = [
  { id: 'u1', displayName: 'Nikita K.' },
  { id: 'u2', displayName: 'Ravi M.' },
  { id: 'u3', displayName: 'Priya S.' },
  { id: 'u4', displayName: 'Arjun T.' },
];

const INITIAL_RULES: RoutingRule[] = [
  {
    id: 'r1', name: 'Critical to Senior SPOC', description: 'Route all S1 tickets to senior agents',
    conditions: [{ field: 'priority', operator: 'equals', value: 'CRITICAL' }],
    assignTo: 'u2', assignToName: 'Ravi M.', priority: 1, isActive: true, matchCount: 42,
  },
  {
    id: 'r2', name: 'Billing to Nikita', description: 'All billing questions handled by Nikita',
    conditions: [{ field: 'category', operator: 'equals', value: 'BILLING' }],
    assignTo: 'u1', assignToName: 'Nikita K.', priority: 2, isActive: true, matchCount: 18,
  },
  {
    id: 'r3', name: 'Bug reports to Priya', description: '',
    conditions: [
      { field: 'category', operator: 'equals', value: 'BUG' },
      { field: 'priority', operator: 'in', value: 'CRITICAL,HIGH' },
    ],
    assignTo: 'u3', assignToName: 'Priya S.', priority: 3, isActive: true, matchCount: 31,
  },
  {
    id: 'r4', name: 'Low priority to Arjun', description: 'Non-urgent tickets go to Arjun',
    conditions: [{ field: 'priority', operator: 'equals', value: 'LOW' }],
    assignTo: 'u4', assignToName: 'Arjun T.', priority: 4, isActive: false, matchCount: 7,
  },
];

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

function conditionSummary(c: RoutingCondition): string {
  const fieldLabel = FIELD_OPTIONS.find(f => f.value === c.field)?.label ?? c.field;
  const opLabel = OPERATOR_OPTIONS[c.field]?.find(o => o.value === c.operator)?.label ?? c.operator;
  return `${fieldLabel} ${opLabel} ${c.value}`;
}

function newId() { return `r${Date.now()}`; }

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
  rule: Partial<RoutingRule>;
  onSave: (r: Partial<RoutingRule>) => void;
  onCancel: () => void;
}

const RuleForm: React.FC<RuleFormProps> = ({ rule, onSave, onCancel }) => {
  const [name, setName] = useState(rule.name ?? '');
  const [description, setDescription] = useState(rule.description ?? '');
  const [assignTo, setAssignTo] = useState(rule.assignTo ?? '');
  const [conditions, setConditions] = useState<RoutingCondition[]>(
    rule.conditions ?? [{ field: 'priority', operator: 'equals', value: 'CRITICAL' }]
  );
  const [isActive, setIsActive] = useState(rule.isActive ?? true);

  const addCondition = () => {
    if (conditions.length >= 10) return;
    setConditions(prev => [...prev, { field: 'priority', operator: 'equals', value: 'CRITICAL' }]);
  };

  const removeCondition = (idx: number) => setConditions(prev => prev.filter((_, i) => i !== idx));

  const updateCondition = (idx: number, field: Partial<RoutingCondition>) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...field } : c));
  };

  const valid = name.trim().length > 0 && assignTo.length > 0 && conditions.length > 0;

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
            options={MOCK_AGENTS.map(a => ({ value: a.id, label: a.displayName }))}
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
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.8125rem', color: 'var(--color-brand-500)', fontWeight: 600, padding: 0,
              }}
            >
              + Add condition
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conditions.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              {idx > 0 && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', minWidth: '1.5rem', textAlign: 'center' }}>AND</span>
              )}
              {idx === 0 && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', minWidth: '1.5rem', textAlign: 'center' }}>IF</span>
              )}

              {/* Field */}
              <Select
                value={c.field}
                onChange={e => updateCondition(idx, { field: e.target.value as ConditionField, operator: OPERATOR_OPTIONS[e.target.value as ConditionField][0].value, value: '' })}
                options={FIELD_OPTIONS}
                style={{ fontSize: '0.8125rem' }}
              />

              {/* Operator */}
              <Select
                value={c.operator}
                onChange={e => updateCondition(idx, { operator: e.target.value as ConditionOperator })}
                options={OPERATOR_OPTIONS[c.field]}
                style={{ fontSize: '0.8125rem' }}
              />

              {/* Value */}
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
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            onClick={() => onSave({ name, description, assignTo, assignToName: MOCK_AGENTS.find(a => a.id === assignTo)?.displayName ?? '', conditions, isActive })}
            disabled={!valid}
          >
            Save rule
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Simulate panel ────────────────────────────────────────────────

const SimulatePanel: React.FC<{ rules: RoutingRule[]; onClose: () => void }> = ({ rules, onClose }) => {
  const [priority, setPriority] = useState('CRITICAL');
  const [category, setCategory] = useState('BUG');
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<{ matched: RoutingRule | null; evaluated: Array<{ rule: RoutingRule; matched: boolean }> } | null>(null);

  const simulate = () => {
    const evaluated = rules.filter(r => r.isActive).map(r => {
      const matched = r.conditions.every(c => {
        if (c.field === 'priority' && c.operator === 'equals') return c.value === priority;
        if (c.field === 'priority' && c.operator === 'in') return c.value.split(',').includes(priority);
        if (c.field === 'category' && c.operator === 'equals') return c.value === category;
        if (c.field === 'category' && c.operator === 'in') return c.value.split(',').includes(category);
        if (c.field === 'keyword' && c.operator === 'contains') return keyword.toLowerCase().includes(c.value.toLowerCase());
        return true;
      });
      return { rule: r, matched };
    });
    const first = evaluated.find(e => e.matched);
    setResult({ matched: first?.rule ?? null, evaluated });
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
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
        <Button size="sm" onClick={simulate}>Simulate</Button>
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
            {result.matched ? `✓ Matched: "${result.matched.name}" → assigned to ${result.matched.assignToName}` : '✕ No matching rule — ticket would be unassigned'}
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

  const [rules, setRules] = useState<RoutingRule[]>(INITIAL_RULES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  // Drag state
  const dragIdx = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };

  const handleDrop = (toIdx: number) => {
    if (dragIdx.current === null || dragIdx.current === toIdx) return;
    const reordered = [...rules];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(toIdx, 0, moved);
    setRules(reordered.map((r, i) => ({ ...r, priority: i + 1 })));
    dragIdx.current = null;
    toast('Rule priority updated', 'success');
  };

  const handleSave = (id: string | null, data: Partial<RoutingRule>) => {
    if (id) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      setEditingId(null);
    } else {
      const newRule: RoutingRule = {
        id: newId(),
        name: data.name ?? 'New Rule',
        description: data.description ?? '',
        conditions: data.conditions ?? [],
        assignTo: data.assignTo ?? '',
        assignToName: data.assignToName ?? '',
        priority: rules.length + 1,
        isActive: data.isActive ?? true,
        matchCount: 0,
      };
      setRules(prev => [...prev, newRule]);
      setCreatingNew(false);
    }
    toast('Routing rule saved', 'success');
  };

  const handleDelete = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, priority: i + 1 })));
    setDeleteTarget(null);
    toast('Routing rule deleted', 'success');
  };

  const handleToggleActive = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

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
      {showSimulator && <SimulatePanel rules={rules} onClose={() => setShowSimulator(false)} />}

      {/* New rule form */}
      {creatingNew && (
        <div style={{ marginBottom: '1rem' }}>
          <RuleForm
            rule={{}}
            onSave={data => handleSave(null, data)}
            onCancel={() => setCreatingNew(false)}
          />
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 && !creatingNew ? (
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
          {rules.map((rule, idx) => {
            const isEditing = editingId === rule.id;
            return (
              <div key={rule.id}>
                {isEditing ? (
                  <RuleForm
                    rule={rule}
                    onSave={data => handleSave(rule.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    style={{
                      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.875rem 1rem',
                      opacity: rule.isActive ? 1 : 0.55,
                      cursor: canEdit ? 'grab' : 'default',
                      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-500)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                        {/* Priority number + drag handle */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem',
                          flexShrink: 0,
                        }}>
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

                          {/* Conditions */}
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
                              {rule.assignToName}
                            </span>
                          </div>

                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                            Matched {rule.matchCount} tickets
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <Toggle checked={rule.isActive} onChange={() => handleToggleActive(rule.id)} disabled={!canEdit} />
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rules.length > 0 && !creatingNew && (
        <div style={{
          marginTop: '0.75rem', padding: '0.625rem 0.875rem',
          background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {canEdit ? <span>⠿ Drag rules to reorder priority. Rule #1 is evaluated first.</span> : <span>Rules are evaluated in priority order. Rule #1 is evaluated first.</span>}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Routing Rule"
        message={`Delete "${rules.find(r => r.id === deleteTarget)?.name}"? This action cannot be undone. Tickets that would have matched this rule will remain unassigned.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
};
