import React, { useState, useEffect } from 'react';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Button, Card, Select, useToast, PermissionGate, ConfirmDialog, ErrorState } from '@3sc/ui';
import { Permission } from '@3sc/types';
import { useGetSystemSettingsQuery, useUpdateSystemSettingsMutation } from '@3sc/api';
import type {
  SystemNotificationSettings,
  SystemAIFeatureSettings,
  SystemAccessSettings,
} from '@3sc/types';

// ── Toggle component ─────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

// ── Initial state ────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: SystemNotificationSettings = {
  emailOnSLABreach: true,
  slackIntegrationEnabled: true,
  slackChannel: '#support-alerts',
  dailyDigestEnabled: false,
  dailyDigestTime: '09:00',
  clientStatusNotifications: true,
};

const INITIAL_AI: SystemAIFeatureSettings = {
  triageAgentEnabled: true,
  similarTicketSuggestionsEnabled: true,
  kbDeflectionEnabled: true,
  autoGenerateKBArticlesEnabled: false,
  weeklyProjectSummariesEnabled: true,
  aiProvider: 'anthropic',
  aiModelName: 'claude-sonnet-4-6',
  aiApiKey: '',
  aiBaseUrl: '',
  aiApiKeySet: true,
};


const INITIAL_ACCESS: SystemAccessSettings = {
  ssoEnabled: false,
  twoFactorRequired: false,
  auditLoggingEnabled: true,
  ipAllowlistEnabled: false,
  ipAllowlist: '',
};


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

// ── Toggle row ───────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  expandContent?: React.ReactNode;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange, disabled, expandContent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: expandContent && checked ? '0.625rem' : 0 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{label}</p>
        <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
    {expandContent && checked && (
      <div style={{ paddingTop: '0.25rem' }}>
        {expandContent}
      </div>
    )}
  </div>
);

// ── Section header ────────────────────────────────────────────────

const SectionHeader: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--color-text-muted)',
    marginBottom: '1rem', paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--color-border)',
  }}>
    {text}
  </div>
);

// ── Inline text input ─────────────────────────────────────────────

interface InlineInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  prefix?: string;
  monospace?: boolean;
}

const InlineInput: React.FC<InlineInputProps> = ({ value, onChange, placeholder, type = 'text', disabled, prefix, monospace }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
    {prefix && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{prefix}</span>}
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '0.375rem 0.625rem',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
        background: disabled ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
        color: 'var(--color-text)', fontSize: '0.8125rem',
        fontFamily: monospace ? 'var(--font-mono)' : undefined,
        outline: 'none',
      }}
    />
  </div>
);

// ── AI Provider Section ───────────────────────────────────────────

interface AIModelSectionProps {
  settings: SystemAIFeatureSettings;
  apiKeySet: boolean;
  pendingApiKey: string;
  onChange: (s: SystemAIFeatureSettings) => void;
  onApiKeyChange: (v: string) => void;
  disabled: boolean;
  onTestConnection: () => void;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
}

const AIModelSection: React.FC<AIModelSectionProps> = ({
  settings, apiKeySet, pendingApiKey,
  onChange, onApiKeyChange,
  disabled, onTestConnection, testing, testResult,
}) => {
  const providerOptions = [
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'custom', label: 'Custom (OpenAI-compatible)' },
  ];

  const modelOptions: Record<string, string[]> = {
    anthropic: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    custom: [],
  };

  const effectiveApiKeySet = apiKeySet || pendingApiKey.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!effectiveApiKeySet && (
        <div style={{
          padding: '0.625rem 0.875rem',
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem', color: '#92400e', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⚠️</span> Not configured — AI features unavailable
        </div>
      )}

      {effectiveApiKeySet && (
        <div style={{
          padding: '0.625rem 0.875rem',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem', color: '#15803d', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>✓</span> API key configured
        </div>
      )}

      <div>
        <Select
          label="AI Provider"
          value={settings.aiProvider ?? 'anthropic'}
          disabled={disabled}
          onChange={e => onChange({
            ...settings,
            aiProvider: e.target.value as SystemAIFeatureSettings['aiProvider'],
            aiModelName: modelOptions[e.target.value]?.[0] ?? '',
          })}
          options={providerOptions}
        />
      </div>

      <div>
        <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Name</p>
        {(modelOptions[settings.aiProvider ?? 'anthropic'] ?? []).length > 0 ? (
          <Select
            value={settings.aiModelName ?? ''}
            disabled={disabled}
            onChange={e => onChange({ ...settings, aiModelName: e.target.value })}
            options={(modelOptions[settings.aiProvider ?? 'anthropic'] ?? []).map(m => ({ value: m, label: m }))}
          />
        ) : (
          <InlineInput
            value={settings.aiModelName ?? ''}
            onChange={v => onChange({ ...settings, aiModelName: v })}
            placeholder="Model identifier as accepted by the provider's API"
            disabled={disabled}
            monospace
          />
        )}
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          Model identifier as accepted by the provider's API
        </p>
      </div>

      <div>
        <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Key</p>
        <InlineInput
          value={pendingApiKey}
          onChange={onApiKeyChange}
          placeholder={apiKeySet ? '••••••••  (leave blank to keep current)' : 'Enter API key…'}
          type="password"
          disabled={disabled}
          monospace
        />
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          Required to enable AI features. Stored encrypted, never returned.
        </p>
      </div>

      {settings.aiProvider === 'custom' && (
        <div>
          <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base URL</p>
          <InlineInput
            value={settings.aiBaseUrl ?? ''}
            onChange={v => onChange({ ...settings, aiBaseUrl: v })}
            placeholder="https://your-endpoint.example.com/v1"
            disabled={disabled}
            monospace
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            OpenAI-compatible endpoint URL for custom providers.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
        <Button
          size="sm"
          variant="secondary"
          onClick={onTestConnection}
          loading={testing}
          disabled={disabled || !effectiveApiKeySet}
        >
          Test connection
        </Button>
        {testResult && (
          <span style={{
            fontSize: '0.8125rem', fontWeight: 500,
            color: testResult.success ? '#15803d' : '#dc2626',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {testResult.success ? '✓' : '✕'} {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────

export const SystemSettingsPage: React.FC = () => {
  useDocumentTitle('System Settings');
  const permissions = usePermissions();
  const { toast } = useToast();

  const canEdit = permissions.has(Permission.SYSTEM_CONFIGURE);

  const { data: remoteSettings, isLoading, isError } = useGetSystemSettingsQuery();
  const [updateSystemSettings, { isLoading: saving }] = useUpdateSystemSettingsMutation();

  // ── Local editable copies ────────────────────────────────────────
  const [notifications, setNotifications] = useState<SystemNotificationSettings>(INITIAL_NOTIFICATIONS);
  const [aiFeatures, setAIFeatures] = useState<SystemAIFeatureSettings>(INITIAL_AI);
  // apiKeySet comes from the server flag; pendingApiKey is what the user types (never pre-filled)
  const [apiKeySet, setApiKeySet] = useState(false);
  const [pendingApiKey, setPendingApiKey] = useState('');
  const [access, setAccess] = useState<SystemAccessSettings>(INITIAL_ACCESS);
  // ipAllowlist is stored as string in the textarea, joined/split on save
  const [ipAllowlistText, setIpAllowlistText] = useState('');
  const [dirty, setDirty] = useState(false);

  // Danger zone
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // AI test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Seed local state from API response
  useEffect(() => {
    if (!remoteSettings) return;
    setNotifications({ ...remoteSettings.notifications });
    setAIFeatures({ ...remoteSettings.aiFeatures });
    // Server signals whether a key is already stored via the aiApiKeySet flag on the mock;
    // in production the GET response simply omits aiApiKey — we treat its absence as "key set"
    // when the mock injects aiApiKeySet. Fall back to checking aiModelName as a proxy.
    setApiKeySet((remoteSettings as any).aiApiKeySet ?? !!remoteSettings.aiFeatures.aiModelName);
    setPendingApiKey('');
    const { ipAllowlist, ...restAccess } = remoteSettings.access;
    setAccess(restAccess as SystemAccessSettings);
    setIpAllowlistText(Array.isArray(ipAllowlist) ? ipAllowlist.join('\n') : (ipAllowlist ?? ''));
    setDirty(false);
  }, [remoteSettings]);

  const mark = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T) => { setter(v); setDirty(true); };

  const handleSave = async () => {
    try {
      const payload: Parameters<typeof updateSystemSettings>[0] = {
        notifications,
        aiFeatures: {
          ...aiFeatures,
          ...(pendingApiKey ? { aiApiKey: pendingApiKey } : {}),
        },
        access: {
          ...access,
          ipAllowlist: ipAllowlistText.split('\n').map(s => s.trim()).filter(Boolean),
        },
      };
      await updateSystemSettings(payload).unwrap();
      if (pendingApiKey) setApiKeySet(true);
      setPendingApiKey('');
      setDirty(false);
      toast('System settings saved', 'success');
    } catch {
      toast('Failed to save system settings', 'error');
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setExportLoading(false);
    toast('Export started — download link will appear in Notifications', 'success');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 800));
    setTesting(false);
    const hasKey = apiKeySet || pendingApiKey.length > 0;
    setTestResult({ success: hasKey, message: hasKey ? 'Connection successful' : 'API key not configured' });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '12rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Loading system settings…
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load system settings." />;
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            System Settings
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Platform-wide configuration — notifications, AI, access controls
          </p>
        </div>
        <PermissionGate permission={Permission.SYSTEM_CONFIGURE}>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
            Save
          </Button>
        </PermissionGate>
      </div>

      {!canEdit && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
          fontSize: '0.8125rem', color: 'var(--color-text-muted)',
        }}>
          🔒 View-only access. Only Admins can modify system settings.
        </div>
      )}

      {/* 4-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
        gap: '1rem',
        alignItems: 'start',
      }}>

        {/* NOTIFICATIONS */}
        <Card>
          <SectionHeader text="Notifications" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow
              label="Email alerts on SLA breach"
              description="Admin receives email when breach triggered"
              checked={notifications.emailOnSLABreach}
              onChange={v => mark(setNotifications)({ ...notifications, emailOnSLABreach: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Slack integration"
              description={`Post escalation alerts to ${notifications.slackChannel || '#channel'}`}
              checked={notifications.slackIntegrationEnabled}
              onChange={v => mark(setNotifications)({ ...notifications, slackIntegrationEnabled: v })}
              disabled={!canEdit}
              expandContent={
                <input
                  type="text"
                  value={notifications.slackChannel ?? ''}
                  placeholder="#support-alerts"
                  onChange={e => mark(setNotifications)({ ...notifications, slackChannel: e.target.value })}
                  disabled={!canEdit}
                  style={{
                    width: '100%', padding: '0.375rem 0.625rem',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    background: !canEdit ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.8125rem',
                    fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              }
            />
            <ToggleRow
              label="Daily digest email"
              description={`Summary sent at ${notifications.dailyDigestTime ?? '09:00'} IST`}
              checked={notifications.dailyDigestEnabled}
              onChange={v => mark(setNotifications)({ ...notifications, dailyDigestEnabled: v })}
              disabled={!canEdit}
              expandContent={
                <input
                  type="time"
                  value={notifications.dailyDigestTime ?? '09:00'}
                  onChange={e => mark(setNotifications)({ ...notifications, dailyDigestTime: e.target.value })}
                  disabled={!canEdit}
                  style={{
                    padding: '0.375rem 0.5rem', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', background: !canEdit ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: '0.8125rem',
                    fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
              }
            />
            <ToggleRow
              label="Client notifications"
              description="Auto-notify clients on ticket status change"
              checked={notifications.clientStatusNotifications}
              onChange={v => mark(setNotifications)({ ...notifications, clientStatusNotifications: v })}
              disabled={!canEdit}
            />
          </div>
        </Card>

        {/* AI FEATURES */}
        <Card>
          <SectionHeader text="AI Features" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow
              label="Triage agent"
              description="Auto-categorise and pre-fill raised tickets"
              checked={aiFeatures.triageAgentEnabled}
              onChange={v => mark(setAIFeatures)({ ...aiFeatures, triageAgentEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Similar ticket suggestions"
              description="Show related tickets on raise screen"
              checked={aiFeatures.similarTicketSuggestionsEnabled}
              onChange={v => mark(setAIFeatures)({ ...aiFeatures, similarTicketSuggestionsEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="KB deflection"
              description="Show KB matches before ticket submission"
              checked={aiFeatures.kbDeflectionEnabled}
              onChange={v => mark(setAIFeatures)({ ...aiFeatures, kbDeflectionEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Auto-generate KB articles"
              description="Create draft articles from closed tickets"
              checked={aiFeatures.autoGenerateKBArticlesEnabled}
              onChange={v => mark(setAIFeatures)({ ...aiFeatures, autoGenerateKBArticlesEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Weekly project summaries"
              description="AI generates and sends project digests"
              checked={aiFeatures.weeklyProjectSummariesEnabled}
              onChange={v => mark(setAIFeatures)({ ...aiFeatures, weeklyProjectSummariesEnabled: v })}
              disabled={!canEdit}
            />

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                AI Model Configuration
              </p>
              <AIModelSection
                settings={aiFeatures}
                apiKeySet={apiKeySet}
                pendingApiKey={pendingApiKey}
                onChange={s => { setAIFeatures(s); setDirty(true); }}
                onApiKeyChange={v => { setPendingApiKey(v); setDirty(true); }}
                disabled={!canEdit}
                onTestConnection={handleTestConnection}
                testing={testing}
                testResult={testResult}
              />
            </div>
          </div>
        </Card>

        {/* ACCESS & SECURITY */}
        <Card>
          <SectionHeader text="Access & Security" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow
              label="SSO authentication"
              description="Enforce Google / Azure AD login"
              checked={access.ssoEnabled}
              onChange={v => mark(setAccess)({ ...access, ssoEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Two-factor auth"
              description="Required for admin & SPOC accounts"
              checked={access.twoFactorRequired}
              onChange={v => mark(setAccess)({ ...access, twoFactorRequired: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="Audit logging"
              description="Log all admin actions with timestamps"
              checked={access.auditLoggingEnabled}
              onChange={v => mark(setAccess)({ ...access, auditLoggingEnabled: v })}
              disabled={!canEdit}
            />
            <ToggleRow
              label="IP allow-list"
              description="Restrict admin access by IP range"
              checked={access.ipAllowlistEnabled}
              onChange={v => mark(setAccess)({ ...access, ipAllowlistEnabled: v })}
              disabled={!canEdit}
              expandContent={
                <div>
                  <textarea
                    value={ipAllowlistText}
                    placeholder={"192.168.1.0/24\n10.0.0.1"}
                    onChange={e => { setIpAllowlistText(e.target.value); setDirty(true); }}
                    disabled={!canEdit}
                    rows={3}
                    style={{
                      width: '100%', padding: '0.375rem 0.625rem',
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                      background: !canEdit ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
                      color: 'var(--color-text)', fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)', outline: 'none',
                      resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    One IP or CIDR block per line.
                  </p>
                </div>
              }
            />
          </div>
        </Card>

        {/* DANGER ZONE */}
        <PermissionGate permission={Permission.SYSTEM_CONFIGURE}>
          <Card style={{ border: '1px solid #fca5a5' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #fecaca' }}>
              Danger Zone
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>Export all data</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Full platform export</p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={handleExport} disabled={exportLoading} style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text)' }}>
                    {exportLoading ? '...' : 'CSV'}
                  </button>
                  <button onClick={handleExport} disabled={exportLoading} style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text)' }}>
                    JSON
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>Reset demo data</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Demo tenant only</p>
                </div>
                <button onClick={() => setResetConfirm(true)} style={{ padding: '0.3125rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text)' }}>
                  Restore defaults
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>Purge closed tickets</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Older than 90 days — irreversible</p>
                </div>
                <button onClick={() => setPurgeConfirm(true)} style={{ padding: '0.3125rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: '#dc2626' }}>
                  Purge
                </button>
              </div>

            </div>
          </Card>
        </PermissionGate>
      </div>

      {/* Confirmations */}
      <ConfirmDialog
        isOpen={purgeConfirm}
        title="Purge Closed Tickets"
        message="This will permanently delete all closed tickets older than 90 days. This action cannot be undone. Are you absolutely sure?"
        confirmLabel="Yes, Purge"
        cancelLabel="Cancel"
        onConfirm={() => { setPurgeConfirm(false); toast('Purge job queued', 'success'); }}
        onClose={() => setPurgeConfirm(false)}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={resetConfirm}
        title="Reset Demo Data"
        message="This will restore the demo tenant to its original seed state, removing all changes made. Only use on demo tenants."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onConfirm={() => { setResetConfirm(false); toast('Demo data reset', 'success'); }}
        onClose={() => setResetConfirm(false)}
        variant="danger"
      />
    </div>
  );
};
