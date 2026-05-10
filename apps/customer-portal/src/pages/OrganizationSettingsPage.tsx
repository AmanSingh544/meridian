import React, { useState, useRef, useEffect } from 'react';
import { useGetSingleOrganizationQuery, useUpdateOrganizationMutation } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  Card, Button, Input, Skeleton, ErrorState, PermissionGate, Badge, useToast,
} from '@3sc/ui';
import { Permission } from '@3sc/types';

const ACCENT_PRESETS = [
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Slate',   value: '#475569' },
];

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'business', 'enterprise'];

// ── Branding Section ──────────────────────────────────────────────

interface BrandingSectionProps {
  disabled: boolean;
  orgId: string;
  initialBranding: {
    portalDisplayName?: string;
    primaryColor?: string;
    logoUrl?: string;
  };
  onSaved: () => void;
}

const BrandingSection: React.FC<BrandingSectionProps> = ({ disabled, orgId, initialBranding, onSaved }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateOrg, { isLoading: saving }] = useUpdateOrganizationMutation();

  const [portalDisplayName, setPortalDisplayName] = useState(initialBranding.portalDisplayName ?? 'Support Portal');
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor ?? '#6366f1');
  const [logoUrl, setLogoUrl] = useState(initialBranding.logoUrl ?? '');
  const [logoPreview, setLogoPreview] = useState<string | null>(initialBranding.logoUrl ?? null);
  const [dirty, setDirty] = useState(false);

  // Re-sync when org data loads after initial render
  useEffect(() => {
    setPortalDisplayName(initialBranding.portalDisplayName ?? 'Support Portal');
    setPrimaryColor(initialBranding.primaryColor ?? '#6366f1');
    setLogoUrl(initialBranding.logoUrl ?? '');
    setLogoPreview(initialBranding.logoUrl ?? null);
    setDirty(false);
  }, [initialBranding.portalDisplayName, initialBranding.primaryColor, initialBranding.logoUrl]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUrl(dataUrl);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoUrl('');
    setDirty(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    try {
      await updateOrg({
        id: orgId,
        payload: {
          branding: {
            portalDisplayName,
            primaryColor,
            logoUrl: logoUrl || undefined,
          },
        },
      }).unwrap();
      setDirty(false);
      onSaved();
      toast('Branding saved', 'success');
    } catch (err: any) {
      toast(err?.data?.message ?? 'Failed to save branding', 'error');
    }
  };

  return (
    <Card hover style={{ marginBottom: '1.25rem' }}>
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
          <div style={{
            width: '4rem', height: '4rem', borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--color-border)',
            background: 'var(--color-bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
              {logoPreview && (
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
          value={portalDisplayName}
          disabled={disabled}
          onChange={e => { setPortalDisplayName(e.target.value); setDirty(true); }}
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
              onClick={() => { setPrimaryColor(preset.value); setDirty(true); }}
              title={preset.label}
              style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: preset.value, border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                outline: primaryColor === preset.value ? `3px solid ${preset.value}` : '3px solid transparent',
                outlineOffset: '2px',
                transition: 'outline var(--transition-fast)',
                opacity: disabled ? 0.5 : 1,
              }}
            />
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              type="color"
              value={primaryColor}
              disabled={disabled}
              onChange={e => { setPrimaryColor(e.target.value); setDirty(true); }}
              style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, background: 'none' }}
            />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {primaryColor}
            </span>
          </div>
        </div>

        {/* Live preview strip */}
        <div style={{
          padding: '0.75rem 1rem',
          background: primaryColor,
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {logoPreview ? (
            <img src={logoPreview} alt="" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', objectFit: 'contain', background: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
              🏢
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', fontFamily: 'var(--font-display)' }}>
            {portalDisplayName || 'Support Portal'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Preview
          </span>
        </div>
      </div>
    </Card>
  );
};


// ── Page ──────────────────────────────────────────────────────────

export const OrganizationSettingsPage: React.FC = () => {
  useDocumentTitle('Organization Settings');
  const session = useSession();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useGetSingleOrganizationQuery({ tenantId: session?.tenantId, page: 1 });
  const [updateOrg, { isLoading: saving }] = useUpdateOrganizationMutation();

  const org = data?.data;//?.find(o => o.id === session?.tenantId);
  const orgBranding = (org as any)?.branding ?? {};

  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [orgPlan, setOrgPlan] = useState('free');
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (org) {
      setOrgName(org.name);
      setOrgSlug(org.slug);
      setOrgDomain(org.domain ?? '');
      setOrgPlan(org.plan ?? 'free');
    }
  }, [org]);

  const cancelEdit = () => {
    setEditing(false);
    setOrgName(org?.name ?? '');
    setOrgSlug(org?.slug ?? '');
    setOrgDomain(org?.domain ?? '');
    setOrgPlan(org?.plan ?? 'free');
  };

  const handleSave = async () => {
    if (!org) return;
    try {
      await updateOrg({
        id: org.id,
        payload: {
          name: orgName.trim(),
          slug: orgSlug.trim(),
          domain: orgDomain.trim() || undefined,
          plan: orgPlan,
        },
      }).unwrap();
      setEditing(false);
      refetch();
      toast('Organization settings saved', 'success');
    } catch (err: any) {
      toast(err?.data?.message ?? 'Failed to save settings', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!org) return;
    setDeactivating(true);
    try {
      await updateOrg({ id: org.id, payload: { is_active: false } }).unwrap();
      refetch();
      toast('Organization deactivated', 'success');
    } catch (err: any) {
      toast(err?.data?.message ?? 'Failed to deactivate organization', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  if (error) return <ErrorState onRetry={refetch} />;
  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="12rem" />
    </div>
  );

  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Organization Settings
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Manage your organization details and configuration
        </p>
      </div>

      {/* Organization Profile */}
      <Card hover style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Organization Profile</h3>
          <PermissionGate permission={Permission.WORKSPACE_CONFIGURE}>
            {!editing ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSave} loading={saving} disabled={!orgName.trim() || !orgSlug.trim()}>Save</Button>
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
              label="Slug"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="acme-corp"
            />
            <Input
              label="Domain"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              placeholder="company.com"
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                Plan
              </label>
              <select
                value={orgPlan}
                onChange={(e) => setOrgPlan(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.625rem',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)', color: 'var(--color-text)',
                  fontSize: '0.875rem', boxSizing: 'border-box',
                }}
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
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
              org?.is_active
                ? <Badge color="#15803d" bgColor="#dcfce7">Active</Badge>
                : <Badge color="#dc2626" bgColor="#fee2e2">Inactive</Badge>
            } />
          </div>
        )}
      </Card>

      {/* Branding — wired to real org data and mutation */}
      {org && (
        <BrandingSection
          disabled={false}
          orgId={org.id}
          initialBranding={{
            portalDisplayName: orgBranding.portalDisplayName,
            primaryColor: orgBranding.primaryColor,
            logoUrl: orgBranding.logoUrl,
          }}
          onSaved={refetch}
        />
      )}

      {/* Tenant Info (read-only) */}
      <Card hover style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Portal Info</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
          <Row label="Tenant ID" value={session?.tenantId ?? '—'} mono />
          <Row label="Tenant Name" value={session?.tenantName ?? '—'} />
          <Row label="Your Role" value={session?.role ?? '—'} />
        </div>
      </Card>

      {/* Danger Zone */}
      <PermissionGate permission={Permission.WORKSPACE_CONFIGURE}>
        <Card style={{ border: '1px solid var(--color-danger)' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-danger)' }}>
            Danger Zone
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
            These actions are irreversible. Please proceed with caution.
          </p>
          <Button
            variant="danger"
            size="sm"
            loading={deactivating}
            disabled={!org?.is_active}
            onClick={handleDeactivate}
          >
            {org?.is_active ? 'Deactivate Organization' : 'Organization Deactivated'}
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
