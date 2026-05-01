import React, { useState, useMemo } from 'react';
import {
  useGetDocumentsQuery,
  useGetDocumentStatsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useGetOrganizationsQuery,
} from '@3sc/api';
import { usePermissions, useSession, useDebouncedValue, useDocumentTitle } from '@3sc/hooks';
import { Permission, DOCUMENT_DEPARTMENTS, type DocumentDepartment, type Document } from '@3sc/types';
import { formatFileSize, formatDate } from '@3sc/utils';
import { Card, MetricCard, SearchInput, Button, Modal, FileUpload, EmptyState, Skeleton, Tabs, ConfirmDialog, useToast, Select } from '@3sc/ui';

interface DocumentsLibraryProps {
  portalType: 'customer' | 'internal';
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.startsWith('text/')) return '📃';
  return '📄';
};

export const DocumentsLibrary: React.FC<DocumentsLibraryProps> = ({ portalType }) => {
  useDocumentTitle('Department Libraries');
  const permissions = usePermissions();
  const session = useSession();
  const { toast } = useToast();
  const canUpload = permissions.has(Permission.DOCUMENT_UPLOAD);
  const canEdit = permissions.has(Permission.DOCUMENT_EDIT);
  const canDelete = permissions.has(Permission.DOCUMENT_DELETE);
  const isAdmin = permissions.isAdmin;

  const [activeDepartment, setActiveDepartment] = useState<string>('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

  const [uploadForm, setUploadForm] = useState<{
    file: File | null;
    filename: string;
    department: DocumentDepartment;
    targetTenantId: string;
  }>({
    file: null,
    filename: '',
    department: 'General',
    targetTenantId: '',
  });

  const [editForm, setEditForm] = useState<{
    filename: string;
    department: DocumentDepartment;
  }>({
    filename: '',
    department: 'General',
  });

  const queryArgs = useMemo(() => ({
    department: activeDepartment === 'All' ? undefined : activeDepartment,
    search: debouncedSearch || undefined,
    page: 1,
    page_size: 100,
  }), [activeDepartment, debouncedSearch]);

  const { data: documentsData, isLoading: docsLoading } = useGetDocumentsQuery(queryArgs);
  const { data: stats } = useGetDocumentStatsQuery({});
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();
  const [updateDocument, { isLoading: updating }] = useUpdateDocumentMutation();
  const [deleteDocument, { isLoading: deleting }] = useDeleteDocumentMutation();
  const { data: orgsResponse, isLoading: orgsLoading } = useGetOrganizationsQuery({ page: 1 });
  const organizations = orgsResponse?.data ?? [];

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    documentsData?.data.forEach((d) => {
      counts.set(d.department, (counts.get(d.department) || 0) + 1);
    });
    return DOCUMENT_DEPARTMENTS.filter((d) => counts.has(d)).map((d) => ({
      key: d,
      label: d,
      badge: counts.get(d),
    }));
  }, [documentsData]);

  const filteredDocs = useMemo(() => {
    if (!documentsData) return [];
    return documentsData.data;
  }, [documentsData]);

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.filename || !uploadForm.department) {
      toast('Please fill in all fields and select a file', 'error');
      return;
    }
    try {
      await uploadDocument({
        file: uploadForm.file,
        filename: uploadForm.filename,
        department: uploadForm.department,
        targetTenantId: isAdmin && portalType === 'internal' ? uploadForm.targetTenantId || undefined : undefined,
      }).unwrap();
      toast('Document uploaded successfully', 'success');
      setUploadOpen(false);
      setUploadForm({ file: null, filename: '', department: 'General', targetTenantId: '' });
    } catch {
      toast('Failed to upload document', 'error');
    }
  };

  const handleEdit = async () => {
    if (!editDoc) return;
    try {
      await updateDocument({
        id: editDoc.id,
        body: {
          filename: editForm.filename,
          department: editForm.department,
        },
      }).unwrap();
      toast('Document updated successfully', 'success');
      setEditDoc(null);
    } catch {
      toast('Failed to update document', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      await deleteDocument(deleteDoc.id).unwrap();
      toast('Document deleted successfully', 'success');
      setDeleteDoc(null);
    } catch {
      toast('Failed to delete document', 'error');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/v1/documents/${doc.id}/download`, {
        credentials: 'include',
        headers: { 'X-Portal-Type': portalType },
      });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download document', 'error');
    }
  };

  const canManageDoc = (doc: Document) => {
    if (isAdmin || permissions.isLead) return true;
    if (canEdit && doc.uploadedBy === session?.userId) return true;
    return false;
  };

  const tabs = useMemo(() => {
    const all = [{ key: 'All', label: 'All', badge: documentsData?.total ?? 0 }];
    const deptTabs = departments.map((d) => ({ key: d.key, label: d.label, badge: d.badge }));
    return [...all, ...deptTabs];
  }, [departments, documentsData]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            📁 Department Libraries
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Centralized document repository for all teams
          </p>
        </div>
        {canUpload && (
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            ⬆️ Upload Files
          </Button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MetricCard title="Total Files" value={stats?.totalFiles ?? 0} />
        <MetricCard title="Departments" value={stats?.totalDepartments ?? 0} />
        <MetricCard title="Total Downloads" value={stats?.totalDownloads ?? 0} />
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <Tabs
            tabs={tabs}
            activeTab={activeDepartment}
            onChange={(key) => setActiveDepartment(key)}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem', maxWidth: '36rem' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search files..." />
      </div>

      {/* Table */}
      <Card>
        {docsLoading ? (
          <SkeletonRow count={5} />
        ) : filteredDocs.length === 0 ? (
          <EmptyState title="No documents found" description="Upload a document to get started." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>File Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Size</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Uploaded By</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Downloads</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.125rem' }}>{getFileIcon(doc.mimeType)}</span>
                        <span style={{ fontWeight: 500 }}>{doc.filename}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                      {formatFileSize(doc.sizeBytes)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                      {doc.uploaderName || 'Unknown'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                      {doc.downloadCount}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleDownload(doc)}
                          title="Download"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-600)', fontSize: '1rem' }}
                        >
                          ⬇️
                        </button>
                        {canManageDoc(doc) && (
                          <>
                            <button
                              onClick={() => {
                                setEditDoc(doc);
                                setEditForm({ filename: doc.filename, department: doc.department });
                              }}
                              title="Edit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1rem' }}
                            >
                              ✏️
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => setDeleteDoc(doc)}
                                title="Delete"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: '1rem' }}
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      {uploadOpen && (
        <Modal
          isOpen={uploadOpen}
          title="Upload Document"
          onClose={() => setUploadOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpload} loading={uploading}>
                Upload
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '24rem' }}>
            <FileUpload
              onFilesSelected={(files) => {
                if (files[0]) {
                  setUploadForm((prev) => ({
                    ...prev,
                    file: files[0],
                    filename: files[0].name,
                  }));
                }
              }}
              maxFiles={1}
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                File Name
              </label>
              <input
                type="text"
                value={uploadForm.filename}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, filename: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Department
              </label>
              <select
                value={uploadForm.department}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, department: e.target.value as DocumentDepartment }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              >
                {DOCUMENT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && portalType === 'internal' && (
              <Select
                label="Target Tenant (optional)"
                placeholder="Leave blank for current tenant"
                value={uploadForm.targetTenantId}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, targetTenantId: e.target.value }))}
                options={organizations.map((org) => ({ value: org.id, label: org.name }))}
                disabled={orgsLoading}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editDoc && (
        <Modal
          isOpen={!!editDoc}
          title="Edit Document"
          onClose={() => setEditDoc(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditDoc(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEdit} loading={updating}>
                Save
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '24rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                File Name
              </label>
              <input
                type="text"
                value={editForm.filename}
                onChange={(e) => setEditForm((prev) => ({ ...prev, filename: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Department
              </label>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value as DocumentDepartment }))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              >
                {DOCUMENT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteDoc && (
        <ConfirmDialog
          isOpen={!!deleteDoc}
          title="Delete Document"
          message={`Are you sure you want to delete "${deleteDoc.filename}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setDeleteDoc(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

const SkeletonRow: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} height="40px" />
    ))}
  </div>
);
