import React, { useState } from 'react';
import {
  useGetDeliveryFeaturesQuery,
  useUpdateDeliveryFeatureMutation,
  useCreateDeliveryFeatureMutation,
  useDeleteDeliveryFeatureMutation,
  useGetDeliveryRiskQuery,
  usePrioritiseDeliveryMutation,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Badge, Button, Skeleton, EmptyState, Modal, Select, useToast } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { DeliveryFeature, DeliveryStatus } from '@3sc/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS: { status: DeliveryStatus; label: string }[] = [
  { status: 'BACKLOG',    label: 'Backlog' },
  { status: 'PLANNED',    label: 'Planned' },
  { status: 'IN_DEV',     label: 'In Dev' },
  { status: 'IN_QA',      label: 'In QA' },
  { status: 'IN_STAGING', label: 'Staging' },
  { status: 'RELEASED',   label: 'Released' },
];

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH:   { bg: 'var(--color-danger-light, #fee2e2)',   text: 'var(--color-danger)' },
  MEDIUM: { bg: 'var(--color-warning-light, #fef3c7)',  text: 'var(--color-warning)' },
  LOW:    { bg: 'var(--color-success-light, #d1fae5)',  text: 'var(--color-success)' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI': '#818cf8', 'Security': '#f87171', 'Analytics': '#34d399',
  'Portal': '#60a5fa', 'Notifications': '#fb923c', 'Integrations': '#a78bfa',
  'Tickets': '#facc15', 'Onboarding': '#2dd4bf', 'Mobile': '#e879f9',
  'Internal Tools': '#94a3b8',
};

// ── Feature Card ──────────────────────────────────────────────────────────────

interface FeatureCardProps {
  feature: DeliveryFeature;
  riskLevel?: string;
  riskReason?: string;
  canManage: boolean;
  onMove: (feature: DeliveryFeature, status: DeliveryStatus) => void;
  onDelete: (id: string) => void;
  onSelect: (feature: DeliveryFeature) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, riskLevel, riskReason, canManage, onMove, onDelete, onSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const catColor = feature.category ? (CATEGORY_COLORS[feature.category] ?? '#94a3b8') : '#94a3b8';

  const moveOptions = COLUMNS
    .filter(c => c.status !== feature.status)
    .map(c => ({ status: c.status, label: c.label }));

  return (
    <Card
      hover
      onClick={() => onSelect(feature)}
      style={{
        position: 'relative',
      }}
    >
      {/* category dot + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-text)' }}>
          {feature.title}
        </span>
      </div>

      {/* category + upvotes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-muted)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
          {feature.category}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          ▲ {feature.upvotes}
        </span>
        {feature.eta && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            ETA {feature.eta.slice(0, 7)}
          </span>
        )}
      </div>

      {/* risk chip */}
      {riskLevel && (
        <div
          style={{
            fontSize: '0.6875rem', fontWeight: 600,
            padding: '0.15rem 0.5rem', borderRadius: 4,
            marginBottom: '0.375rem',
            background: RISK_COLORS[riskLevel]?.bg,
            color: RISK_COLORS[riskLevel]?.text,
            display: 'inline-block',
          }}
          title={riskReason}
        >
          {riskLevel} risk
        </div>
      )}

      {/* assignee */}
      {feature.assignee && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          {feature.assignee}
        </div>
      )}

      {/* move menu */}
      {canManage && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem', lineHeight: 1, padding: '0.1rem 0.3rem' }}
          >
            ···
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 20,
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '0.375rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '10rem', padding: '0.25rem 0',
            }}>
              {moveOptions.map(opt => (
                <button
                  key={opt.status}
                  onClick={() => { onMove(feature, opt.status); setMenuOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.4rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--color-text)' }}
                >
                  Move to {opt.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0.25rem 0' }} />
              <button
                onClick={() => { onDelete(feature.id); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.4rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--color-danger)' }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const DeliveryBoardPage: React.FC = () => {
  useDocumentTitle('Delivery Board');
  const perms = usePermissions();
  const { toast } = useToast();
  const canManage = perms.has(Permission.DELIVERY_MANAGE);

  const { data: features, isLoading } = useGetDeliveryFeaturesQuery();
  const { data: risks } = useGetDeliveryRiskQuery(undefined, { skip: !canManage });
  const [updateFeature] = useUpdateDeliveryFeatureMutation();
  const [createFeature] = useCreateDeliveryFeatureMutation();
  const [deleteFeature] = useDeleteDeliveryFeatureMutation();
  const [prioritise, { isLoading: isPrioritising, data: prioritised }] = usePrioritiseDeliveryMutation();

  const [selectedFeature, setSelectedFeature] = useState<DeliveryFeature | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrioritiseModal, setShowPrioritiseModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const quarterOptions = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    const quarters: string[] = [];
    for (let offset = 0; offset < 6; offset++) {
      const totalQ = (currentQ - 1 + offset);
      const q = (totalQ % 4) + 1;
      const y = year + Math.floor(totalQ / 4);
      quarters.push(`Q${q} ${y}`);
    }
    return quarters;
  })();
  const [newQuarter, setNewQuarter] = useState(quarterOptions[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [addingCol, setAddingCol] = useState<DeliveryStatus>('BACKLOG');

  // Build risk lookup by featureId
  const riskByFeature = risks ? Object.fromEntries(risks.map(r => [r.featureId, r])) : {};

  const handleMove = async (feature: DeliveryFeature, status: DeliveryStatus) => {
    try {
      await updateFeature({ id: feature.id, data: { status } }).unwrap();
      toast(`Moved "${feature.title}" to ${status}`, 'success');
    } catch {
      toast('Failed to update feature status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeature(id).unwrap();
      toast('Feature deleted', 'success');
    } catch {
      toast('Failed to delete feature', 'error');
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createFeature({
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: addingCol,
        category: newCategory || 'Other',
        quarter: newQuarter,
        isPublic,
      }).unwrap();
      toast('Feature created', 'success');
      setShowAddModal(false);
      setNewTitle(''); setNewDesc(''); setNewCategory('');
    } catch {
      toast('Failed to create feature', 'error');
    }
  };

  const handlePrioritise = async () => {
    try {
      await prioritise().unwrap();
      setShowPrioritiseModal(true);
    } catch {
      toast('AI prioritisation failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
          {COLUMNS.map(col => (
            <div key={col.status} style={{ minWidth: '13rem', flex: '0 0 13rem' }}>
              <Skeleton height="1.5rem" style={{ marginBottom: '0.75rem' }} />
              {[1,2,3].map(i => <Skeleton key={i} height="5.625rem" style={{ marginBottom: '0.5rem' }} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!features) {
    return <EmptyState title="No delivery data" description="Could not load delivery board." />;
  }

  const byStatus = (status: DeliveryStatus) => features.filter(f => f.status?.toLowerCase() === status?.toLowerCase());

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Delivery Board</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
            {features.length} features tracked across {COLUMNS.length} stages
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={handlePrioritise} loading={isPrioritising}>
              AI Prioritise
            </Button>
            <Button variant="primary" onClick={() => { setAddingCol('BACKLOG'); setShowAddModal(true); }}>
              + Add Feature
            </Button>
          </div>
        )}
      </div>

      {/* Risk banner */}
      {risks && risks.some(r => r.riskLevel === 'HIGH') && (
        <div style={{
          background: 'var(--color-danger-light, #fee2e2)',
          border: '1px solid var(--color-danger)',
          borderRadius: '0.5rem',
          padding: '0.625rem 1rem',
          fontSize: '0.8125rem',
          color: 'var(--color-danger)',
          flexShrink: 0,
        }}>
          <strong>At-risk features detected:</strong>{' '}
          {risks.filter(r => r.riskLevel === 'HIGH').map(r => r.featureTitle).join(', ')} — check cards for details.
        </div>
      )}

      {/* Kanban columns */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', flex: 1, alignItems: 'flex-start', paddingBottom: '0.5rem' }}>
        {COLUMNS.map(col => {
          const cards = byStatus(col.status);
          return (
            <Card
              key={col.status}
              style={{
                minWidth: '13.5rem', flex: '0 0 13.5rem',
                background: 'var(--color-bg-muted)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: 'calc(100vh - 14rem)',
                overflowY: 'auto',
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>{col.label}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>{cards.length}</span>
              </div>

              {/* Cards */}
              {cards.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                  No features
                </div>
              ) : (
                cards.map(f => (
                  <FeatureCard
                    key={f.id}
                    feature={f}
                    riskLevel={riskByFeature[f.id]?.riskLevel}
                    riskReason={riskByFeature[f.id]?.reason}
                    canManage={canManage}
                    onMove={handleMove}
                    onDelete={handleDelete}
                    onSelect={setSelectedFeature}
                  />
                ))
              )}

              {/* Add in column */}
              {canManage && (
                <button
                  onClick={() => { setAddingCol(col.status); setShowAddModal(true); }}
                  style={{
                    background: 'none', border: '1px dashed var(--color-border)', borderRadius: '0.375rem',
                    color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '0.4rem',
                    cursor: 'pointer', marginTop: '0.25rem',
                  }}
                >
                  + Add
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Feature detail drawer */}
      {selectedFeature && (
        <Modal isOpen onClose={() => setSelectedFeature(null)} title={selectedFeature.title} width="36rem">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {selectedFeature.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.8125rem' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Status</span><br /><strong>{selectedFeature.status}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Category</span><br /><strong>{selectedFeature.category}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Quarter</span><br /><strong>{selectedFeature.quarter}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Upvotes</span><br /><strong>{selectedFeature.upvotes}</strong></div>
              {selectedFeature.eta && (
                <div><span style={{ color: 'var(--color-text-muted)' }}>ETA</span><br /><strong>{selectedFeature.eta.slice(0, 10)}</strong></div>
              )}
              {selectedFeature.assignee && (
                <div><span style={{ color: 'var(--color-text-muted)' }}>Assignee</span><br /><strong>{selectedFeature.assignee}</strong></div>
              )}
              <div><span style={{ color: 'var(--color-text-muted)' }}>Visibility</span><br /><strong>{selectedFeature.isPublic ? 'Public (on roadmap)' : 'Internal only'}</strong></div>
            </div>
            {riskByFeature[selectedFeature.id] && (
              <Card hover style={{ padding: '0.75rem', background: RISK_COLORS[riskByFeature[selectedFeature.id].riskLevel]?.bg }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: RISK_COLORS[riskByFeature[selectedFeature.id].riskLevel]?.text }}>
                  {riskByFeature[selectedFeature.id].riskLevel} Risk
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  {riskByFeature[selectedFeature.id].reason}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Recommendation: {riskByFeature[selectedFeature.id].recommendation}
                </p>
              </Card>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedFeature(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add feature modal */}
      {showAddModal && (
        <Modal isOpen onClose={() => setShowAddModal(false)} title="Add Feature" width="36rem">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Title *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Feature title"
                style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Description</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-bg)', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Category</label>
                <input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="e.g. AI, Security"
                  style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <Select
                  label="Quarter"
                  value={newQuarter}
                  onChange={e => setNewQuarter(e.target.value)}
                  options={quarterOptions.map(q => ({ value: q, label: q }))}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                Show on client roadmap
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAdd} disabled={!newTitle.trim()}>Add Feature</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Prioritise results modal */}
      {showPrioritiseModal && prioritised && (
        <Modal isOpen onClose={() => setShowPrioritiseModal(false)} title="AI Prioritisation" width="36rem">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Based on upvotes, client demand, and business value, here are the recommended next moves:
            </p>
            {prioritised.map(p => (
              <Card hover key={p.featureId} style={{ padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.featureTitle}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 4, background: 'var(--color-brand-100))', color: 'var(--color-brand-600)' }}>Score: {p.score}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                  Suggest: <strong>{p.suggestedStatus}</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{p.reasoning}</p>
              </Card>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowPrioritiseModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DeliveryBoardPage;
