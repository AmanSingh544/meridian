import React, { useState } from 'react';
import { useGetOrganizationsQuery, useUpdateOrganizationMutation, useCreateOrganizationMutation } from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { DataTable, Pagination, Badge, Avatar, Button, Modal, Input, PermissionGate } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { Organization } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'business', 'enterprise'];

// ── Create Organization Modal ──────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateOrganizationModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [createOrg, { isLoading: creating }] = useCreateOrganizationMutation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState('free');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(toSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setError(null);
    try {
      await createOrg({
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
        plan,
        is_active: isActive,
      }).unwrap();
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message ?? 'Failed to create organization.');
    }
  };

  const isValid = name.trim().length > 0 && slug.trim().length > 0;

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
  };

  return (
    <Modal isOpen onClose={onClose} title="New Organization" width="30rem">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <Input
          label="Organization Name *"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Corp"
          autoFocus
        />

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
            Slug *
          </label>
          <Input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme-corp"
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Unique URL-friendly identifier. Auto-generated from name.
          </p>
        </div>

        <Input
          label="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="acme.com"
        />

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
            Plan
          </label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={selectStyle}>
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active tenant
        </label>

        {error && (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-danger)', background: 'var(--color-danger-bg, #fef2f2)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={creating} disabled={!isValid}>
            Create Organization
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────────

export const OrganizationsPage: React.FC = () => {
  useDocumentTitle('Organizations');
  const permissions = usePermissions();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useGetOrganizationsQuery({ page });
  const [updateOrg, { isLoading: saving }] = useUpdateOrganizationMutation();

  const [showCreate, setShowCreate] = useState(false);

  // ── Edit modal state ───────────────────────────────────────────
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editActive, setEditActive] = useState(true);

  const openEdit = (org: Organization) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditDomain(org.domain ?? '');
    setEditPlan(org.plan ?? 'free');
    setEditActive(org.is_active);
  };

  const handleSave = async () => {
    if (!editOrg) return;
    await updateOrg({
      id: editOrg.id,
      payload: {
        name: editName.trim(),
        slug: editSlug.trim(),
        domain: editDomain.trim() || undefined,
        plan: editPlan,
        is_active: editActive,
      },
    }).unwrap();
    setEditOrg(null);
    refetch();
  };

  const handleToggleActive = async (org: Organization) => {
    await updateOrg({ id: org.id, payload: { is_active: !org.is_active } }).unwrap();
    refetch();
  };

  const columns = [
    {
      key: 'name', header: 'Organization', width: '18rem',
      render: (o: Organization) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={o.name} size={30} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{o.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'domain', header: 'Domain', width: '12rem',
      render: (o: Organization) => (
        <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>{o.domain || '—'}</span>
      ),
    },
    {
      key: 'plan', header: 'Plan', width: '7rem',
      render: (o: Organization) => o.plan
        ? <Badge color="#7c3aed" bgColor="#ede9fe">{o.plan}</Badge>
        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>—</span>,
    },
    {
      key: 'status', header: 'Status', width: '6rem',
      render: (o: Organization) => (
        <Badge
          color={o.is_active ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={o.is_active ? '#dcfce7' : '#f3f4f6'}
        >
          {o.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at', header: 'Created', width: '10rem',
      render: (o: Organization) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {formatDateTime(o.created_at)}
        </span>
      ),
    },
    {
      key: 'actions', header: '', width: '10rem',
      render: (o: Organization) => (
        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
          <PermissionGate permission={Permission.MEMBER_MANAGE}>
            <Button
              variant="ghost" size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(o); }}
            >
              Edit
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleToggleActive(o); }}
              style={{ color: o.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {o.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Organizations
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {data?.total ?? 0} total tenants
          </p>
        </div>
        <PermissionGate permission={Permission.MEMBER_MANAGE}>
          <Button onClick={() => setShowCreate(true)}>
            + New Organization
          </Button>
        </PermissionGate>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        emptyMessage="No organizations found"
      />

      {data && <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />}

      {/* ── Create Organization Modal ──────────────────────────── */}
      {showCreate && (
        <CreateOrganizationModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { refetch(); }}
        />
      )}

      {/* ── Edit Organization Modal ────────────────────────────── */}
      {editOrg && (
        <Modal isOpen onClose={() => setEditOrg(null)} title={`Edit — ${editOrg.name}`} width="30rem">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Organization Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Acme Corp"
              autoFocus
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                Slug
              </label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="acme-corp"
              />
            </div>
            <Input
              label="Domain"
              value={editDomain}
              onChange={(e) => setEditDomain(e.target.value)}
              placeholder="acme.com"
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                Plan
              </label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                  background: 'var(--color-bg)', color: 'var(--color-text)',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                }}
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Active tenant
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEditOrg(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving} disabled={!editName.trim() || !editSlug.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
