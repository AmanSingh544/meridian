import React, { useState } from 'react';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Button, Card, useToast, PermissionGate, ErrorState } from '@3sc/ui';
import { Permission } from '@3sc/types';

// ── Types ─────────────────────────────────────────────────────────

interface PriorityRow {
  key: string;
  label: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  responseHours: number;
  resolutionHours: number;
}

interface EscalationRules {
  autoEscalateAtPercent: number;
  notifyAdminAtPercent: number;
  s1ReAlertIntervalMinutes: number;
}

interface BusinessHours {
  startTime: string;
  endTime: string;
  timezone: string;
  pauseOnWeekends: boolean;
}

// ── Initial state (matches mock API) ─────────────────────────────

const INITIAL_PRIORITIES: PriorityRow[] = [
  { key: 'CRITICAL', label: 'S1 — Critical', level: 'critical', responseHours: 2,  resolutionHours: 8 },
  { key: 'HIGH',     label: 'S2 — Moderate', level: 'high',     responseHours: 8,  resolutionHours: 48 },
  { key: 'MEDIUM',   label: 'S3 — Low',      level: 'medium',   responseHours: 24, resolutionHours: 120 },
  { key: 'LOW',      label: 'S4 — Minimal',  level: 'low',      responseHours: 48, resolutionHours: 240 },
];

const INITIAL_ESCALATION: EscalationRules = {
  autoEscalateAtPercent: 80,
  notifyAdminAtPercent: 60,
  s1ReAlertIntervalMinutes: 30,
};

const INITIAL_BUSINESS: BusinessHours = {
  startTime: '09:00',
  endTime: '18:00',
  timezone: 'Asia/Kolkata',
  pauseOnWeekends: false,
};

// ── Severity pill colors ──────────────────────────────────────────

const levelColors = {
  critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  high:     { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  medium:   { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  low:      { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
};

// ── Sub-components ────────────────────────────────────────────────

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffix?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min = 1, max = 9999, disabled, suffix }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={e => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
      style={{
        width: '5rem', padding: '0.375rem 0.5rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: disabled ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
        fontSize: '0.875rem', fontFamily: 'var(--font-mono)',
        textAlign: 'center',
        outline: 'none',
      }}
    />
    {suffix && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{suffix}</span>}
  </div>
);

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
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

// ── Preview panel ─────────────────────────────────────────────────

interface PreviewPanelProps {
  priorities: PriorityRow[];
  businessHours: BusinessHours;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ priorities, businessHours }) => (
  <div style={{
    background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: '1rem',
  }}>
    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
      Timeline Preview — S1 Ticket
    </div>
    {(() => {
      const s1 = priorities.find(p => p.key === 'CRITICAL')!;
      const now = new Date();
      const responseBy = new Date(now.getTime() + s1.responseHours * 3_600_000);
      const resolveBy = new Date(now.getTime() + s1.resolutionHours * 3_600_000);
      const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-500)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Ticket created:</span>
            <span style={{ fontWeight: 600 }}>{fmt(now)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>First response by:</span>
            <span style={{ fontWeight: 600, color: '#d97706' }}>{fmt(responseBy)} (+{s1.responseHours}h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Resolution by:</span>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>{fmt(resolveBy)} (+{s1.resolutionHours}h)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Business hours: {businessHours.startTime} – {businessHours.endTime} {businessHours.timezone}
            {businessHours.pauseOnWeekends && ' · Weekends excluded'}
          </div>
        </div>
      );
    })()}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────

export const SLAConfigPage: React.FC = () => {
  useDocumentTitle('SLA Configuration');
  const permissions = usePermissions();
  const { toast } = useToast();

  const canEdit = permissions.has(Permission.SLA_CONFIGURE);

  const [priorities, setPriorities] = useState<PriorityRow[]>(INITIAL_PRIORITIES);
  const [escalation, setEscalation] = useState<EscalationRules>(INITIAL_ESCALATION);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_BUSINESS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // ── Validation ──────────────────────────────────────────────────
  const validate = (): string[] => {
    const errs: string[] = [];
    for (const p of priorities) {
      if (p.resolutionHours <= p.responseHours) {
        errs.push(`${p.label}: Resolution time must be greater than response time.`);
      }
    }
    if (escalation.notifyAdminAtPercent > escalation.autoEscalateAtPercent) {
      errs.push('Notify admin % must be less than or equal to auto-escalate %.');
    }
    if (escalation.s1ReAlertIntervalMinutes < 5) {
      errs.push('S1 re-alert interval must be at least 5 minutes.');
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDirty(false);
    toast('SLA configuration saved', 'success');
  };

  const updatePriority = (key: string, field: 'responseHours' | 'resolutionHours', value: number) => {
    setPriorities(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
    setDirty(true);
    setErrors([]);
  };

  const sectionHeader = (text: string) => (
    <div style={{
      fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--color-text-muted)',
      marginBottom: '1rem', paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {text}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            SLA Configuration
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Set response targets, resolution deadlines, and escalation thresholds
          </p>
        </div>
        <PermissionGate permission={Permission.SLA_CONFIGURE}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </PermissionGate>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
        }}>
          <p style={{ margin: '0 0 0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#dc2626' }}>
            Please fix the following before saving:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {errors.map((e, i) => (
              <li key={i} style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-only banner for non-admins */}
      {!canEdit && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
          fontSize: '0.8125rem', color: 'var(--color-text-muted)',
        }}>
          🔒 You have view-only access. Contact a Lead or Admin to modify SLA settings.
        </div>
      )}

      {/* Top row: SLA targets table + side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 18rem', gap: '1rem', marginBottom: '1rem' }}>

        {/* Combined SLA targets — one row per priority, response + resolution side by side */}
        <Card>
          {sectionHeader('SLA Targets')}
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 9rem 9rem',
            gap: '0.75rem', alignItems: 'center',
            paddingBottom: '0.5rem', marginBottom: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Priority
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              First Response
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Resolution
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {priorities.map(p => {
              const colors = levelColors[p.level];
              return (
                <div key={p.key} style={{
                  display: 'grid', gridTemplateColumns: '1fr 9rem 9rem',
                  gap: '0.75rem', alignItems: 'center',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {/* Priority label */}
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '0.25rem 0.625rem',
                      borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 700,
                      background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                    }}>
                      {p.label}
                    </span>
                  </div>
                  {/* Response hours */}
                  <div>
                    <NumberInput
                      value={p.responseHours}
                      onChange={v => updatePriority(p.key, 'responseHours', v)}
                      disabled={!canEdit}
                      suffix="h"
                    />
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      First response target
                    </p>
                  </div>
                  {/* Resolution hours */}
                  <div>
                    <NumberInput
                      value={p.resolutionHours}
                      onChange={v => updatePriority(p.key, 'resolutionHours', v)}
                      disabled={!canEdit}
                      suffix="h"
                    />
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      Full resolution target
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right column: Escalation + Business Hours stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Escalation Rules */}
          <Card>
            {sectionHeader('Escalation Rules')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Auto-escalate at breach
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Triggers auto-assign to senior SPOC
                </p>
                <NumberInput
                  value={escalation.autoEscalateAtPercent}
                  onChange={v => { setEscalation(prev => ({ ...prev, autoEscalateAtPercent: v })); setDirty(true); }}
                  min={10} max={100} suffix="%" disabled={!canEdit}
                />
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Notify admin at %
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Sends admin alert notification
                </p>
                <NumberInput
                  value={escalation.notifyAdminAtPercent}
                  onChange={v => { setEscalation(prev => ({ ...prev, notifyAdminAtPercent: v })); setDirty(true); }}
                  min={10} max={100} suffix="%" disabled={!canEdit}
                />
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  S1 re-alert interval
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Repeat alerts until resolved
                </p>
                <NumberInput
                  value={escalation.s1ReAlertIntervalMinutes}
                  onChange={v => { setEscalation(prev => ({ ...prev, s1ReAlertIntervalMinutes: v })); setDirty(true); }}
                  min={5} max={480} suffix="min" disabled={!canEdit}
                />
              </div>
            </div>
          </Card>

          {/* Business Hours */}
          <Card>
            {sectionHeader('Business Hours')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>Start time</p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  SLA clock start ({businessHours.timezone.split('/')[1]?.replace('_', ' ') ?? 'IST'})
                </p>
                <input
                  type="time" value={businessHours.startTime} disabled={!canEdit}
                  onChange={e => { setBusinessHours(prev => ({ ...prev, startTime: e.target.value })); setDirty(true); }}
                  style={{
                    padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', background: !canEdit ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>End time</p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  SLA clock end ({businessHours.timezone.split('/')[1]?.replace('_', ' ') ?? 'IST'})
                </p>
                <input
                  type="time" value={businessHours.endTime} disabled={!canEdit}
                  onChange={e => { setBusinessHours(prev => ({ ...prev, endTime: e.target.value })); setDirty(true); }}
                  style={{
                    padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', background: !canEdit ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.125rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Weekend SLA pause
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Exclude Sat &amp; Sun from clock
                  </p>
                </div>
                <Toggle
                  checked={businessHours.pauseOnWeekends}
                  onChange={v => { setBusinessHours(prev => ({ ...prev, pauseOnWeekends: v })); setDirty(true); }}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Live timeline preview */}
      <PreviewPanel priorities={priorities} businessHours={businessHours} />

      {/* Per-org overrides hint */}
      <div style={{
        marginTop: '1rem', padding: '0.75rem 1rem',
        background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8125rem', color: 'var(--color-text-muted)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span>💡</span>
        <span>
          These are the global default SLA settings. Per-client SLA overrides can be configured from
          the <button
            onClick={() => {}}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-500)', padding: 0, fontSize: 'inherit', fontWeight: 600 }}
          >
            Organizations
          </button> page.
        </span>
      </div>
    </div>
  );
};
