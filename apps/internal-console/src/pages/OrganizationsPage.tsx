import React, { useState } from 'react';
import { useGetOrganizationsQuery, useUpdateOrganizationMutation } from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { DataTable, Pagination, Badge, Avatar, Button, Modal, Input, PermissionGate } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { Organization } from '@3sc/types';
import { formatDateTime } from '@3sc/utils';

export const OrganizationsPage: React.FC = () => {
  useDocumentTitle('Organizations');
  const permissions = usePermissions();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useGetOrganizationsQuery({ page });
  const [updateOrg, { isLoading: saving }] = useUpdateOrganizationMutation();

  // ── Edit modal state ───────────────────────────────────────────
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editActive, setEditActive] = useState(true);

  const openEdit = (org: Organization) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditDomain(org.domain ?? '');
    setEditActive(org.isActive);
  };

  const handleSave = async () => {
    if (!editOrg) return;
    await updateOrg({
      id: editOrg.id,
      payload: { name: editName.trim(), domain: editDomain.trim() || undefined, isActive: editActive },
    }).unwrap();
    setEditOrg(null);
    refetch();
  };

  const handleToggleActive = async (org: Organization) => {
    await updateOrg({ id: org.id, payload: { isActive: !org.isActive } }).unwrap();
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
          color={o.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'}
          bgColor={o.isActive ? '#dcfce7' : '#f3f4f6'}
        >
          {o.isActive ? 'Active' : 'Inactive'}
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
              style={{ color: o.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {o.isActive ? 'Deactivate' : 'Activate'}
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
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        emptyMessage="No organizations found"
      />

      {data && <Pagination page={data.page} total_pages={data.total_pages} onPageChange={setPage} />}

      {/* ── Edit Organization Modal ────────────────────────────── */}
      {editOrg && (
        <Modal isOpen onClose={() => setEditOrg(null)} title={`Edit Organization — ${editOrg.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Organization Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Acme Corp"
              autoFocus
            />
            <Input
              label="Domain"
              value={editDomain}
              onChange={(e) => setEditDomain(e.target.value)}
              placeholder="acme.com"
            />
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
              <Button onClick={handleSave} loading={saving} disabled={!editName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
