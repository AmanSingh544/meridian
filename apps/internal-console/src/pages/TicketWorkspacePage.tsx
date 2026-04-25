import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetTicketQuery, useGetCommentsQuery,
  useTransitionTicketMutation, useUpdateTicketMutation,
  useCreateCommentMutation,
  useGetAIClassificationQuery, useGetAIPriorityQuery,
  useGetAIRoutingQuery, useGetAISuggestedReplyQuery,
  useGetAISummaryQuery, useGetAIETAQuery,
  useAcceptAISuggestionMutation, useRejectAISuggestionMutation,
  useGetAIKBSuggestionsQuery,
} from '@3sc/api';
import {
  useDocumentTitle, usePermissions, useTicketTransitions,
} from '@3sc/hooks';
import {
  Button, Card, StatusBadge, PriorityBadge, SLATimer,
  ThreadedComments, AISuggestionCard, AIBanner,
  Drawer, ConfirmDialog, Badge, Avatar, Select,
  ErrorState, Skeleton, Tabs, TabPanel, ConfidenceBar,
} from '@3sc/ui';
import { TicketStatus, Permission } from '@3sc/types';
import { getStatusLabel, getStatusColor, formatDateTime, getPriorityLabel } from '@3sc/utils';

export const TicketWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const { data: ticket, isLoading, error, refetch } = useGetTicketQuery(id!);
  const { data: comments = [] } = useGetCommentsQuery(id!);
  const [transitionTicket, { isLoading: transitioning }] = useTransitionTicketMutation();
  const [updateTicket] = useUpdateTicketMutation();
  const [createComment] = useCreateCommentMutation();
  const [acceptSuggestion] = useAcceptAISuggestionMutation();
  const [rejectSuggestion] = useRejectAISuggestionMutation();

  // AI queries
  const canAI = permissions.canUseAI();
  const { data: aiClassification, isLoading: classLoading } = useGetAIClassificationQuery(id!, { skip: !canAI });
  const { data: aiPriority, isLoading: prioLoading } = useGetAIPriorityQuery(id!, { skip: !canAI });
  const { data: aiRouting, isLoading: routeLoading } = useGetAIRoutingQuery(id!, { skip: !canAI });
  const { data: aiReply, isLoading: replyLoading } = useGetAISuggestedReplyQuery(id!, { skip: !canAI });
  const { data: aiSummary, isLoading: summaryLoading } = useGetAISummaryQuery(id!, { skip: !canAI });
  const { data: aiETA, isLoading: etaLoading } = useGetAIETAQuery(id!, { skip: !canAI });
  const canKBSuggest = permissions.has(Permission.AI_KB_SUGGEST);
  const { data: aiKBSuggestions, isLoading: kbSuggestLoading } = useGetAIKBSuggestionsQuery(id!, { skip: !canKBSuggest || !id });

  const [confirmTransition, setConfirmTransition] = useState<TicketStatus | null>(null);
  const [activeTab, setActiveTab] = useState('conversation');
  const [showAIPanel, setShowAIPanel] = useState(false);

  useDocumentTitle(ticket ? `${ticket.ticketNumber} — Workspace` : 'Ticket');

  const { availableTransitions } = useTicketTransitions(ticket?.status ?? TicketStatus.OPEN);

  const handleTransition = async () => {
    if (!confirmTransition || !id) return;
    await transitionTicket({ ticketId: id, toStatus: confirmTransition }).unwrap();
    setConfirmTransition(null);
  };

  const handleAddComment = async (content: string, isInternal?: boolean) => {
    if (!id) return;
    await createComment({ ticketId: id, content, isInternal });
  };

  if (error) return <ErrorState onRetry={refetch} />;
  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="20rem" />
    </div>
  );
  if (!ticket) return <ErrorState title="Ticket not found" />;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => navigate('/tickets')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: 0, marginBottom: '0.375rem' }}
        >
          ← Back to queue
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.assignee && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <Avatar name={ticket.assignee.displayName ?? 'Unknown'} size={18} />
                  {ticket.assignee.displayName ?? 'Unknown'}
                </span>
              )}
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {ticket.title}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {canAI && (
              <Button variant="ghost" size="sm" onClick={() => setShowAIPanel(true)}>
                🤖 AI Panel
              </Button>
            )}
            {permissions.canChangeStatus() && availableTransitions.map((status) => (
              <Button
                key={status}
                variant={status === TicketStatus.RESOLVED ? 'success' : 'secondary'}
                size="sm"
                onClick={() => setConfirmTransition(status)}
              >
                → {getStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 18rem', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Main workspace */}
        <div>
          {/* AI Banner for classification/priority */}
          {canAI && aiClassification && aiClassification.status === 'pending' && (
            <div style={{ marginBottom: '0.875rem' }}>
              <AIBanner
                title={`Suggested: ${aiClassification.suggestion?.category} (${getPriorityLabel(aiPriority?.suggestion?.priority ?? ticket.priority)})`}
                description={aiRouting?.suggestion?.reason || 'AI has analyzed this ticket'}
                confidence={aiClassification.confidence}
                onAccept={() => acceptSuggestion({ suggestionId: aiClassification.id })}
                onReject={() => rejectSuggestion({ suggestionId: aiClassification.id })}
                loading={classLoading}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs
            tabs={[
              { key: 'conversation', label: 'Conversation', badge: comments.length },
              { key: 'internal', label: 'Internal Notes', badge: comments.filter((c) => c.isInternal).length },
              { key: 'details', label: 'Details' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <TabPanel active={activeTab === 'conversation'}>
            {/* Suggested reply */}
            {canAI && aiReply && !replyLoading && aiReply.status === 'pending' && (
              <div style={{ marginBottom: '1rem' }}>
                <AISuggestionCard
                  type="Suggested Reply"
                  title="Draft Response"
                  content={
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {aiReply.suggestion?.content}
                    </div>
                  }
                  confidence={aiReply.confidence}
                  onAccept={() => acceptSuggestion({ suggestionId: aiReply.id })}
                  onEdit={() => {/* Would open editor */}}
                  onReject={() => rejectSuggestion({ suggestionId: aiReply.id })}
                />
              </div>
            )}
            <ThreadedComments
              comments={comments.filter((c) => !c.isInternal)}
              onAddComment={(content) => handleAddComment(content, false)}
              onReply={(parentId, content) => createComment({ ticketId: id!, content, parentId })}
              showInternalToggle={false}
            />
          </TabPanel>

          <TabPanel active={activeTab === 'internal'}>
            {permissions.canCreateInternalComments() ? (
              <ThreadedComments
                comments={comments.filter((c) => c.isInternal)}
                onAddComment={(content) => handleAddComment(content, true)}
                showInternalToggle={false}
              />
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                You do not have permission to view internal notes.
              </p>
            )}
          </TabPanel>

          <TabPanel active={activeTab === 'details'}>
            <Card>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>
                {ticket.description}
              </div>
              {ticket.attachments.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {ticket.attachments.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                      background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-brand-600)', textDecoration: 'none',
                    }}>📎 {a.fileName}</a>
                  ))}
                </div>
              )}
            </Card>
          </TabPanel>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* SLA */}
          {ticket.sla && (
            <Card padding="0.875rem">
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                SLA
              </h4>
              <SLATimer sla={ticket.sla} />
            </Card>
          )}

          {/* ETA */}
          {canAI && aiETA && (
            <Card padding="0.875rem">
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                🤖 Est. Resolution
              </h4>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-brand-700)' }}>
                ~{aiETA.suggestion?.estimatedHours}h
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                Range: {aiETA.suggestion?.range?.low}h — {aiETA.suggestion?.range?.high}h
              </div>
              <div style={{ marginTop: '0.375rem' }}>
                <ConfidenceBar confidence={aiETA.confidence} />
              </div>
            </Card>
          )}

          {/* Details */}
          <Card padding="0.875rem">
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
              Details
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Category</span>
                <Badge>{ticket.category}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Created</span>
                <span style={{ fontSize: '0.75rem' }}>{formatDateTime(ticket.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Reporter</span>
                <span style={{ fontSize: '0.75rem' }}>{ticket.creator?.displayName || '—'}</span>
              </div>
              {ticket.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {ticket.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* AI Panel Drawer */}
      <Drawer isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} title="AI Assistant" width="24rem">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary */}
          <AISuggestionCard
            type="Thread Summary"
            title="Conversation Summary"
            content={summaryLoading ? 'Loading...' : aiSummary?.suggestion?.summary || 'Not available'}
            confidence={aiSummary?.confidence ?? 0}
            status={aiSummary?.status}
          />

          {/* Classification */}
          <AISuggestionCard
            type="Classification"
            title={`Category: ${aiClassification?.suggestion?.category || '...'}`}
            content={`Subcategory: ${aiClassification?.suggestion?.subcategory || 'N/A'}`}
            confidence={aiClassification?.confidence ?? 0}
            status={aiClassification?.status}
            onAccept={aiClassification?.status === 'pending' ? () => acceptSuggestion({ suggestionId: aiClassification!.id }) : undefined}
            onReject={aiClassification?.status === 'pending' ? () => rejectSuggestion({ suggestionId: aiClassification!.id }) : undefined}
          />

          {/* Routing */}
          {aiRouting && (
            <AISuggestionCard
              type="Routing"
              title={`Suggested: ${aiRouting.suggestion?.agentName || '...'}`}
              content={
                <div>
                  <p style={{ margin: 0 }}>{aiRouting.suggestion?.reason}</p>
                  {aiRouting.suggestion?.alternativeAgents?.length ? (
                    <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Alternatives: {aiRouting.suggestion.alternativeAgents.map((a) => a.agentName).join(', ')}
                    </div>
                  ) : null}
                </div>
              }
              confidence={aiRouting.confidence}
              status={aiRouting.status}
              onAccept={aiRouting.status === 'pending' ? () => acceptSuggestion({ suggestionId: aiRouting.id }) : undefined}
              onReject={aiRouting.status === 'pending' ? () => rejectSuggestion({ suggestionId: aiRouting.id }) : undefined}
            />
          )}

          {/* ETA */}
          {aiETA && (
            <AISuggestionCard
              type="ETA Prediction"
              title={`~${aiETA.suggestion?.estimatedHours}h estimated`}
              content={
                <div>
                  <p style={{ margin: 0 }}>Range: {aiETA.suggestion?.range?.low}h — {aiETA.suggestion?.range?.high}h</p>
                  {aiETA.suggestion?.factors?.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>• {f}</div>
                  ))}
                </div>
              }
              confidence={aiETA.confidence}
              status={aiETA.status}
            />
          )}

          {/* KB Suggestions */}
          {canKBSuggest && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                  📚 Relevant KB Articles
                </span>
              </div>
              {kbSuggestLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height="3rem" />
                  ))}
                </div>
              ) : aiKBSuggestions && aiKBSuggestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {aiKBSuggestions.map((s) => (
                    <a
                      key={s.articleId}
                      href={`/knowledge/${s.articleId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block', padding: '0.625rem 0.75rem',
                        background: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none', color: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-brand-700)', marginBottom: '0.25rem' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        {s.excerpt.slice(0, 100)}…
                      </div>
                      <div style={{ marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(s.score * 100)}%`, background: s.score > 0.7 ? 'var(--color-success)' : 'var(--color-brand-500)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {Math.round(s.score * 100)}% match
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.75rem 0' }}>
                  No relevant articles found for this ticket.
                </p>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* Transition Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmTransition}
        onClose={() => setConfirmTransition(null)}
        onConfirm={handleTransition}
        title={`Transition to ${getStatusLabel(confirmTransition!)}`}
        message={`Change ticket status from "${getStatusLabel(ticket.status)}" to "${getStatusLabel(confirmTransition!)}"?`}
        loading={transitioning}
      />
    </div>
  );
};
