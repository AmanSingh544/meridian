import React, { useState, useRef } from 'react';
import { useGetOrganizationsQuery } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  Card, Button, Input, Skeleton, ErrorState, PermissionGate, Badge, useToast,
} from '@3sc/ui';
import { Permission } from '@3sc/types';

// ── Branding accent options ───────────────────────────────────────
const ACCENT_PRESETS = [
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Slate',   value: '#475569' },
];

// ── Branding Section ──────────────────────────────────────────────

interface BrandingState {
  portalDisplayName: string;
  primaryColor: string;
  logoUrl: string;
  logoPreview: string | null;
}

const BrandingSection: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<BrandingState>({
    portalDisplayName: 'Support Portal',
    primaryColor: '#6366f1',
    logoUrl: '',
    logoPreview: null,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [customColor, setCustomColor] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setBranding(prev => ({ ...prev, logoPreview: ev.target?.result as string }));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDirty(false);
    toast('Branding saved', 'success');
  };

  const handleRemoveLogo = () => {
    setBranding(prev => ({ ...prev, logoPreview: null, logoUrl: '' }));
    setDirty(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Portal Branding</h3>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Customise how this portal looks to your team
          </p>
        </div>
        <PermissionGate permission={Permission.BRANDING_CONFIGURE}>
          {dirty && (
            <Button size="sm" onClick={handleSave} loading={saving}>Save branding</Button>
          )}
        </PermissionGate>
      </div>

      {/* Logo upload */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          Organization Logo
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Preview */}
          <div style={{
            width: '4rem', height: '4rem', borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--color-border)',
            background: 'var(--color-bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {branding.logoPreview ? (
              <img src={branding.logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>🏢</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <PermissionGate permission={Permission.BRANDING_CONFIGURE}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={disabled}
                  style={{
                    padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', cursor: disabled ? 'not-allowed' : 'pointer',
                    color: 'var(--color-text)', opacity: disabled ? 0.5 : 1,
                  }}
                >
                  Upload logo
                </button>
              </PermissionGate>
              {branding.logoPreview && (
                <button
                  onClick={handleRemoveLogo}
                  style={{
                    padding: '0.375rem 0.75rem', fontSize: '0.8125rem',
                    background: 'none', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: '#dc2626',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              PNG, JPG, SVG or WebP. Max 2MB. Recommended 200×200px.
            </p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
      </div>

      {/* Portal display name */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
          Portal Display Name
        </label>
        <input
          value={branding.portalDisplayName}
          disabled={disabled}
          onChange={e => { setBranding(prev => ({ ...prev, portalDisplayName: e.target.value })); setDirty(true); }}
          placeholder="e.g. Acme Support Hub"
          style={{
            width: '100%', padding: '0.5rem 0.625rem',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            background: disabled ? 'var(--color-bg-subtle)' : 'var(--color-bg)',
            color: 'var(--color-text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Shown in the browser tab and portal header.
        </p>
      </div>

      {/* Primary color */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          Primary Color
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {ACCENT_PRESETS.map(preset => (
            <button
              key={preset.value}
              disabled={disabled}
              onClick={() => { setBranding(prev => ({ ...prev, primaryColor: preset.value })); setDirty(true); }}
              title={preset.label}
              style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: preset.value, border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                outline: branding.primaryColor === preset.value ? `3px solid ${preset.value}` : '3px solid transparent',
                outlineOffset: '2px',
                transition: 'outline var(--transition-fast)',
                opacity: disabled ? 0.5 : 1,
              }}
            />
          ))}

          {/* Custom hex input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              type="color"
              value={branding.primaryColor}
              disabled={disabled}
              onChange={e => { setBranding(prev => ({ ...prev, primaryColor: e.target.value })); setDirty(true); }}
              style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, background: 'none' }}
            />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {branding.primaryColor}
            </span>
          </div>
        </div>

        {/* Live preview strip */}
        <div style={{
          padding: '0.75rem 1rem',
          background: branding.primaryColor,
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {branding.logoPreview ? (
            <img src={branding.logoPreview} alt="" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', objectFit: 'contain', background: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
              🏢
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', fontFamily: 'var(--font-display)' }}>
            {branding.portalDisplayName || 'Support Portal'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Preview
          </span>
        </div>
      </div>
    </Card>
  );
};

// ── Mock data — replace with live API when ready ──────────────────
const orgMock = {
  id: 'org001',
  name: 'Acme Corporation',
  slug: 'acme-corporation',
  domain: 'acme.com',
  logoUrl: '',
  isActive: true,
  plan: 'Enterprise',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
};

export const OrganizationSettingsPage: React.FC = () => {
  useDocumentTitle('Organization Settings');
  const session = useSession();

  // Live query — commented out until API is ready
  // const { data, isLoading, error, refetch } = useGetOrganizationsQuery({ page: 1 });
  const { data, isLoading, error, refetch } = {
    data: { data: [orgMock], total: 1, page: 1, page_size: 20, total_pages: 1 },
    isLoading: false, error: null, refetch: () => {},
  };

  const org = data?.data[0];

  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState(org?.name ?? '');
  const [orgDomain, setOrgDomain] = useState(org?.domain ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // TODO: wire up PATCH /organizations/:id when endpoint is ready
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // Simulated save
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (error) return <ErrorState onRetry={refetch} />;
  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="12rem" />
    </div>
  );

  return (
    <div style={{ maxWidth: '42rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Organization Settings
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Manage your organization details and configuration
        </p>
      </div>

      {saved && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
          fontSize: '0.875rem', color: '#15803d',
        }}>
          ✅ Organization settings saved successfully.
        </div>
      )}

      {/* Organization Profile */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Organization Profile</h3>
          <PermissionGate permission={Permission.WORKSPACE_CONFIGURE}>
            {!editing ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
              </div>
            )}
          </PermissionGate>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
            <Input
              label="Domain"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              placeholder="company.com"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
            <Row label="Organization Name" value={org?.name ?? '—'} />
            <Row label="Slug" value={org?.slug ?? '—'} mono />
            <Row label="Domain" value={org?.domain ?? '—'} />
            <Row label="Plan" value={
              <Badge color="#7c3aed" bgColor="#ede9fe">{org?.plan ?? 'Free'}</Badge>
            } />
            <Row label="Status" value={
              org?.isActive
                ? <Badge color="#15803d" bgColor="#dcfce7">Active</Badge>
                : <Badge color="#dc2626" bgColor="#fee2e2">Inactive</Badge>
            } />
          </div>
        )}
      </Card>

      {/* Branding */}
      <BrandingSection disabled={!session || false} />

      {/* Tenant Info (read-only) */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Portal Info</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
          <Row label="Tenant ID" value={session?.tenantId ?? '—'} mono />
          <Row label="Tenant Name" value={session?.tenantName ?? '—'} />
          <Row label="Your Role" value={session?.role ?? '—'} />
        </div>
      </Card>

      {/* Danger Zone — only for WORKSPACE_CONFIGURE (CLIENT_ADMIN and ADMIN) */}
      <PermissionGate permission={Permission.WORKSPACE_CONFIGURE}>
        <Card style={{ border: '1px solid var(--color-danger)' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-danger)' }}>
            Danger Zone
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
            These actions are irreversible. Please proceed with caution.
          </p>
          <Button variant="danger" size="sm" onClick={() => {
            // TODO: wire up deactivation API when endpoint is ready
          }}>
            Deactivate Organization
          </Button>
        </Card>
      </PermissionGate>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
    <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
    <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.8125rem' : undefined }}>
      {value}
    </span>
  </div>
);
