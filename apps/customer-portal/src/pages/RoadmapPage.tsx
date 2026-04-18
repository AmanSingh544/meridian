import React, { useState, useMemo } from 'react';
import {
  useGetRoadmapFeaturesQuery,
  useVoteRoadmapFeatureMutation,
  useUnvoteRoadmapFeatureMutation,
  useSubmitFeatureRequestMutation,
  useGetRoadmapSummaryQuery,
  useClassifyFeatureRequestMutation,
} from '@3sc/api';
import { useDocumentTitle, usePermissions } from '@3sc/hooks';
import { Card, Button, Skeleton, EmptyState, Modal, useToast } from '@3sc/ui';
import { Permission } from '@3sc/types';
import type { DeliveryFeature, DeliveryStatus } from '@3sc/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  BACKLOG:    'Considering',
  PLANNED:    'Planned',
  IN_DEV:     'In Development',
  IN_QA:      'In Testing',
  IN_STAGING: 'Coming Soon',
  RELEASED:   'Released',
};


const CATEGORY_COLORS: Record<string, string> = {
  'AI': '#818cf8', 'Security': '#f87171', 'Analytics': '#34d399',
  'Portal': '#60a5fa', 'Notifications': '#fb923c', 'Integrations': '#a78bfa',
  'Tickets': '#facc15', 'Onboarding': '#2dd4bf', 'Mobile': '#e879f9',
  'Other': '#94a3b8',
};

// ── Feature Card ──────────────────────────────────────────────────────────────

interface FeatureCardProps {
  feature: DeliveryFeature;
  isHighlighted: boolean;
  canVote: boolean;
  onVote: (id: string, hasVoted: boolean) => void;
  onSelect: (f: DeliveryFeature) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, isHighlighted, canVote, onVote, onSelect }) => {
  const catColor = feature.category ? (CATEGORY_COLORS[feature.category] ?? '#94a3b8') : '#94a3b8';

  /**
   * Blue border + glow → card ID is in aiSummary.topRelevantFeatureIds — these are features the AI identified as most relevant to your organisation. They also show the "Recommended for you" pill label.
     Gray border + flat shadow → all other cards
   */
  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: `1.5px solid ${isHighlighted ? 'var(--color-brand-600)' : 'rgba(148,163,184,0.3)'}`,
        borderRadius: '0.625rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isHighlighted ? '0 0 0 2px var(--color-brand-600)' : '0 1px 4px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={e => { if (!isHighlighted) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(148,163,184,0.6)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)'; } }}
      onMouseLeave={e => { if (!isHighlighted) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(148,163,184,0.3)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)'; } }}
      onClick={() => onSelect(feature)}
    >
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0, marginTop: 5 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4 }}>
            {feature.title}
          </span>
        </div>
        {(() => { const s = feature.status; const bg = s === "RELEASED" ? "var(--color-success-light, #d1fae5)" : s === "IN_QA" || s === "IN_STAGING" ? "var(--color-warning-light, #fef3c7)" : s === "BACKLOG" ? "var(--color-bg-muted)" : "rgba(99,102,241,0.12)"; const cl = s === "RELEASED" ? "var(--color-success)" : s === "IN_QA" || s === "IN_STAGING" ? "var(--color-warning)" : s === "BACKLOG" ? "var(--color-text-muted)" : "var(--color-brand-600)"; return <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 4, background: bg, color: cl, whiteSpace: "nowrap" }}>{STATUS_LABEL[feature.status]}</span>; })()}
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        {feature.description.length > 100 ? feature.description.slice(0, 100) + '…' : feature.description}
      </p>

      {/* footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-muted)', border: '1px solid rgba(148,163,184,0.2)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
            {feature.category}
          </span>
          {feature.eta && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              ETA {feature.eta.slice(0, 7)}
            </span>
          )}
          {isHighlighted && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-brand-600)', background: 'var(--color-brand-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
              Recommended for you
            </span>
          )}
        </div>

        {/* Vote button */}
        {canVote && (
          <button
            onClick={e => { e.stopPropagation(); onVote(feature.id, feature.hasVoted ?? false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.625rem', borderRadius: '999px',
              border: `1px solid ${feature.hasVoted ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
              background: feature.hasVoted ? 'var(--color-brand-600)' : 'transparent',
              color: feature.hasVoted ? '#fff' : 'var(--color-text-muted)',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            ▲ {feature.upvotes}
          </button>
        )}
        {!canVote && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>▲ {feature.upvotes}</span>
        )}
      </div>
    </div>
  );
};

// ── Request Feature Modal ─────────────────────────────────────────────────────

const RequestFeatureModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [classifyRequest, { data: classification, isLoading: isClassifying }] = useClassifyFeatureRequestMutation();
  const [submitRequest, { isLoading: isSubmitting }] = useSubmitFeatureRequestMutation();
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    if (!title.trim()) return;
    await classifyRequest({ title, description: desc });
    setChecked(true);
  };

  const handleSubmit = async () => {
    try {
      await submitRequest({ title, description: desc }).unwrap();
      toast('Feature request submitted — thank you!', 'success');
      onClose();
    } catch {
      toast('Failed to submit request', 'error');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Request a Feature" width="36rem">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Tell us what you need. We review all requests and add the most popular ones to our roadmap.
        </p>
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Feature title *</label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setChecked(false); }}
            placeholder="e.g. Bulk export tickets to CSV"
            style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Description</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            placeholder="Describe the problem you're trying to solve…"
            style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-bg)', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* Check for duplicates */}
        {!checked && (
          <Button variant="secondary" loading={isClassifying} onClick={handleCheck} disabled={!title.trim()}>
            Check for similar features
          </Button>
        )}

        {/* Classification result */}
        {checked && classification && (
          <div style={{
            padding: '0.875rem', borderRadius: '0.5rem',
            background: classification.isDuplicate ? 'var(--color-warning-light, #fef3c7)' : 'var(--color-success-light, #d1fae5)',
            border: `1px solid ${classification.isDuplicate ? 'var(--color-warning)' : 'var(--color-success)'}`,
          }}>
            {classification.isDuplicate ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-warning)', marginBottom: '0.375rem' }}>
                  Similar feature exists
                </div>
                <p style={{ margin: '0 0 0.375rem', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  <strong>"{classification.similarFeatureTitle}"</strong> is already on our roadmap. Consider upvoting it instead!
                </p>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{classification.recommendation}</p>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-success)', marginBottom: '0.375rem' }}>
                  Looks like a new request
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{classification.recommendation}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isSubmitting} onClick={handleSubmit} disabled={!title.trim()}>
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const RoadmapPage: React.FC = () => {
  useDocumentTitle('Product Roadmap');
  const permissions = usePermissions();
  
  const { toast } = useToast();
  const canVote = permissions.has(Permission.ROADMAP_VOTE);
  const canRequest = permissions.has(Permission.ROADMAP_REQUEST);

  const { data: features, isLoading } = useGetRoadmapFeaturesQuery();
  const { data: aiSummary } = useGetRoadmapSummaryQuery(undefined, { skip: !canVote });
  const [vote] = useVoteRoadmapFeatureMutation();
  const [unvote] = useUnvoteRoadmapFeatureMutation();

  const [selectedFeature, setSelectedFeature] = useState<DeliveryFeature | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const handleVote = async (id: string, hasVoted: boolean) => {
    try {
      if (hasVoted) {
        await unvote(id).unwrap();
      } else {
        await vote(id).unwrap();
      }
    } catch {
      toast('', 'error');
    }
  };

  // Group by quarter
  const quarters = useMemo(() => {
    if (!features) return [];
    const map = new Map<string, DeliveryFeature[]>();
    for (const f of features) {
      const q = f.quarter ?? 'Unknown';
      if (!map.has(q)) map.set(q, []);
      map.get(q)!.push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [features]);

  const categories = useMemo(() => {
    if (!features) return [];
    const cats = new Set(features.map(f => f.category).filter((c): c is string => !!c));
    return ['All', ...Array.from(cats).sort()];
  }, [features]);

  const filteredFeatures = useMemo(() => {
    if (!features) return [];
    if (activeCategory === 'All') return features;
    return features.filter(f => f.category === activeCategory);
  }, [features, activeCategory]);

  const filteredQuarters = useMemo(() => {
    if (activeCategory === 'All') return quarters;
    return quarters.map(([q, fs]) => [q, fs.filter(f => f.category === activeCategory)] as [string, DeliveryFeature[]]).filter(([, fs]) => fs.length > 0);
  }, [quarters, activeCategory]);

  const highlightedIds = new Set(aiSummary?.topRelevantFeatureIds ?? []);

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton height="5rem" />
        {[1,2,3].map(i => <Skeleton key={i} height="12.5rem" />)}
      </div>
    );
  }

  if (!features || features.length === 0) {
    return <EmptyState title="No roadmap items" description="The product roadmap is not available yet." />;
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.25rem' }}>Product Roadmap</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            See what we're building and vote for the features most important to your team.
          </p>
        </div>
        {canRequest && (
          <Button variant="primary" onClick={() => setShowRequest(true)}>
            + Request a Feature
          </Button>
        )}
      </div>

      {/* AI personalised summary */}
      {aiSummary && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-bg-muted)',
          borderRadius: '0.625rem',
          border: '1px solid var(--color-border)',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>✦</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-brand-600)', marginBottom: '0.3rem' }}>
              PERSONALISED FOR YOU
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text)' }}>{aiSummary.headline}</p>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600,
              border: `1px solid ${activeCategory === cat ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
              background: activeCategory === cat ? 'var(--color-brand-600)' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--color-text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quarters */}
      {filteredQuarters.map(([quarter, cards]) => (
        <div key={quarter}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {quarter}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
              {cards.length} feature{cards.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '0.75rem' }}>
            {cards.map(f => (
              <FeatureCard
                key={f.id}
                feature={f}
                isHighlighted={highlightedIds.has(f.id)}
                canVote={canVote}
                onVote={handleVote}
                onSelect={setSelectedFeature}
              />
            ))}
          </div>
        </div>
      ))}

      {filteredFeatures.length === 0 && activeCategory !== 'All' && (
        <EmptyState title={`No ${activeCategory} features`} description="Try a different category filter." />
      )}

      {/* Feature detail modal */}
      {selectedFeature && (
        <Modal isOpen onClose={() => setSelectedFeature(null)} title={selectedFeature.title} width="36rem">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {(() => { const s = selectedFeature.status; const bg = s === "RELEASED" ? "var(--color-success-light, #d1fae5)" : s === "IN_QA" || s === "IN_STAGING" ? "var(--color-warning-light, #fef3c7)" : s === "BACKLOG" ? "var(--color-bg-muted)" : "rgba(99,102,241,0.12)"; const cl = s === "RELEASED" ? "var(--color-success)" : s === "IN_QA" || s === "IN_STAGING" ? "var(--color-warning)" : s === "BACKLOG" ? "var(--color-text-muted)" : "var(--color-brand-600)"; return <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 4, background: bg, color: cl, whiteSpace: "nowrap" }}>{STATUS_LABEL[selectedFeature.status]}</span>; })()}
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {selectedFeature.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.8125rem' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Category</span><br /><strong>{selectedFeature.category}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Quarter</span><br /><strong>{selectedFeature.quarter}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Votes</span><br /><strong>{selectedFeature.upvotes}</strong></div>
              {selectedFeature.eta && <div><span style={{ color: 'var(--color-text-muted)' }}>ETA</span><br /><strong>{selectedFeature.eta.slice(0, 10)}</strong></div>}
            </div>
            {canVote && (
              <Button
                variant={selectedFeature.hasVoted ? 'secondary' : 'primary'}
                onClick={() => { handleVote(selectedFeature.id, selectedFeature.hasVoted ?? false); setSelectedFeature(null); }}
              >
                {selectedFeature.hasVoted ? '▼ Remove vote' : '▲ Vote for this feature'}
              </Button>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedFeature(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request modal */}
      {showRequest && <RequestFeatureModal onClose={() => setShowRequest(false)} />}
    </div>
  );
};

export default RoadmapPage;
