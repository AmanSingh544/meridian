import React, { useState } from 'react';
import { useGetOrganizationsQuery } from '@3sc/api';
import { useDocumentTitle, useSession } from '@3sc/hooks';
import {
  Card, Button, Input, Skeleton, ErrorState, PermissionGate, Badge,
} from '@3sc/ui';
import { Permission } from '@3sc/types';

// ── Mock data — replace with live API when ready ──────────────────
const orgMock = {
  id: 'org001',
  name: 'Acme Corporation',
  slug: 'acme-corporation',
  domain: 'acme.com',
  logoUrl: '',
  isActive: true,
  plan: 'Enterprise',
  createdAt: '2024-06-01T00:00:00Z',
  updatedAt: '2026-04-10T00:00:00Z',
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
          <PermissionGate permission={Permission.ORG_EDIT}>
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

      {/* Tenant Info (read-only) */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Portal Info</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
          <Row label="Tenant ID" value={session?.tenantId ?? '—'} mono />
          <Row label="Tenant Name" value={session?.tenantName ?? '—'} />
          <Row label="Your Role" value={session?.role ?? '—'} />
        </div>
      </Card>

      {/* Danger Zone — only for org:manage */}
      <PermissionGate permission={Permission.ORG_MANAGE}>
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
