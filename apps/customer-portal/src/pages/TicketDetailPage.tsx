import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetTicketQuery, useGetCommentsQuery,
  useTransitionTicketMutation, useCreateCommentMutation,
  useGetAISummaryQuery, useUpdateTicketMutation,
} from '@3sc/api';
import { useDocumentTitle, usePermissions, useTicketTransitions } from '@3sc/hooks';
import {
  Button, Card, StatusBadge, PriorityBadge, SLATimer,
  ThreadedComments, Timeline, TimelineItem,
  AIBanner, ErrorState, Skeleton, Badge, Drawer,
  ConfirmDialog, Select, Input, TextArea, PermissionGate,
} from '@3sc/ui';
import { TicketStatus, TicketPriority, TicketCategory, Permission } from '@3sc/types';
import { getStatusLabel, formatDateTime, getStatusColor } from '@3sc/utils';
import type { TicketUpdatePayload } from '@3sc/types';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const { data: ticket, isLoading, error, refetch } = useGetTicketQuery(id!);
  const { data: comments = [] } = useGetCommentsQuery(id!);
  const [transitionTicket, { isLoading: transitioning }] = useTransitionTicketMutation();
  const [createComment] = useCreateCommentMutation();
  const [updateTicket, { isLoading: updating }] = useUpdateTicketMutation();
  const { data: aiSummary, isLoading: summaryLoading } = useGetAISummaryQuery(id!, {
    skip: !permissions.canUseAI(),
  });

  const [showSummary, setShowSummary] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState<TicketStatus | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [editCategory, setEditCategory] = useState<TicketCategory>(TicketCategory.SUPPORT);

  useDocumentTitle(ticket ? `${ticket.ticketNumber} - ${ticket.title}` : 'Ticket');

  const { availableTransitions } = useTicketTransitions(
    ticket?.status ?? TicketStatus.OPEN,
  );

  const handleTransition = async () => {
    if (!confirmTransition || !id) return;
    try {
      await transitionTicket({ ticketId: id, toStatus: confirmTransition }).unwrap();
      setConfirmTransition(null);
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleAddComment = async (content: string, isInternal?: boolean) => {
    if (!id) return;
    await createComment({ ticket_id: id, message: content, user_id: '1', isInternal });
  };

  const openEditDrawer = () => {
    if (!ticket) return;
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setEditCategory(ticket.category);
    setShowEditDrawer(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    const payload: TicketUpdatePayload = {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      category: editCategory,
    };
    try {
      await updateTicket({ id, payload }).unwrap();
      setShowEditDrawer(false);
    } catch {
      // Error handled by RTK Query
    }
  };

  if (error) return <ErrorState onRetry={refetch} />;
  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton height="2rem" width="50%" />
      <Skeleton height="1rem" width="30%" />
      <Skeleton height="20rem" />
    </div>
  );
  if (!ticket) return <ErrorState title="Ticket not found" />;

  // Customers see only OPEN/CLOSED transitions; internal users see all
  const visibleTransitions = permissions.isInternal
    ? availableTransitions
    : availableTransitions.filter((s) => s === TicketStatus.OPEN || s === TicketStatus.CLOSED);

  // Determine which comments to show
  const visibleComments = permissions.canCreateInternalComments()
    ? (showInternalNotes ? comments : comments.filter((c) => !c.isInternal))
    : comments.filter((c) => !c.isInternal);

  const internalCount = comments.filter((c) => c.isInternal).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/tickets')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', color: 'var(--color-text-muted)',
            marginBottom: '0.5rem', padding: 0,
          }}
        >
          ← Back to tickets
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {ticket.title}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {permissions.canUseAI() && (
              <Button variant="ghost" size="sm" onClick={() => setShowSummary(true)}>
                🤖 AI Summary
              </Button>
            )}
            {/* Edit ticket button — gated on ticket:edit */}
            <PermissionGate permission={Permission.TICKET_EDIT}>
              <Button variant="secondary" size="sm" onClick={openEditDrawer}>
                ✏️ Edit
              </Button>
            </PermissionGate>
            {visibleTransitions.map((status) => (
              <Button
                key={status}
                variant={status === TicketStatus.OPEN ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setConfirmTransition(status)}
              >
                {status === TicketStatus.OPEN ? 'Reopen' : getStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 20rem', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Description */}
          <Card>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Description</h3>
            <div style={{
              fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
            }}>
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
                  }}>
                    📎 {a.fileName}
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Comments */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                Conversation ({visibleComments.filter((c) => !c.isInternal).length})
              </h3>
              {/* Internal notes toggle — only for users with COMMENT_INTERNAL (internal staff) */}
              <PermissionGate permission={Permission.COMMENT_INTERNAL}>
                <button
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                  style={{
                    background: showInternalNotes ? '#fef3c7' : 'var(--color-bg-subtle)',
                    border: `1px solid ${showInternalNotes ? '#f59e0b' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.625rem',
                    color: showInternalNotes ? '#b45309' : 'var(--color-text-muted)',
                  }}
                >
                  🔒 Internal Notes {internalCount > 0 && `(${internalCount})`}
                </button>
              </PermissionGate>
            </div>
            <ThreadedComments
              comments={visibleComments}
              onAddComment={permissions.canCreateComments() ? handleAddComment : undefined}
              showInternalToggle={permissions.canCreateInternalComments()}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* SLA */}
          {ticket.sla && (
            <Card padding="0">
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>SLA Status</h4>
              </div>
              <div style={{ padding: '0.75rem 1rem' }}>
                <SLATimer sla={ticket.sla} />
              </div>
            </Card>
          )}

          {/* Details */}
          <Card>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}>Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Category</span>
                <Badge>{ticket.category}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Created</span>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Updated</span>
                <span>{formatDateTime(ticket.updatedAt)}</span>
              </div>
              {ticket.assignee && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Assigned to</span>
                  <span>{ticket.assignee.displayName}</span>
                </div>
              )}
              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {ticket.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}>Timeline</h4>
            <Timeline>
              <TimelineItem
                title="Ticket Created"
                timestamp={formatDateTime(ticket.createdAt)}
                color={getStatusColor(TicketStatus.OPEN)}
                isLast={!ticket.resolvedAt}
              />
              {ticket.resolvedAt && (
                <TimelineItem
                  title="Resolved"
                  timestamp={formatDateTime(ticket.resolvedAt)}
                  color={getStatusColor(TicketStatus.RESOLVED)}
                  isLast={!ticket.closedAt}
                />
              )}
              {ticket.closedAt && (
                <TimelineItem
                  title="Closed"
                  timestamp={formatDateTime(ticket.closedAt)}
                  color={getStatusColor(TicketStatus.CLOSED)}
                  isLast
                />
              )}
            </Timeline>
          </Card>
        </div>
      </div>

      {/* Edit Ticket Drawer */}
      <Drawer isOpen={showEditDrawer} onClose={() => setShowEditDrawer(false)} title="Edit Ticket">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Ticket title"
          />
          <TextArea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Describe the issue..."
            rows={5}
          />
          <Select
            label="Priority"
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
            options={Object.values(TicketPriority).map((p) => ({ value: p, label: p }))}
          />
          <Select
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
            options={Object.values(TicketCategory).map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowEditDrawer(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              loading={updating}
              disabled={!editTitle.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Drawer>

      {/* AI Summary Drawer */}
      <Drawer isOpen={showSummary} onClose={() => setShowSummary(false)} title="AI Thread Summary">
        {summaryLoading ? (
          <AIBanner title="" description="" loading />
        ) : aiSummary ? (
          <div>
            <AIBanner
              title="Conversation Summary"
              description={aiSummary.suggestion?.summary || 'No summary available'}
              confidence={aiSummary.confidence}
            />
            {aiSummary.suggestion?.keyPoints && (
              <Card style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>Key Points</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', lineHeight: 1.8 }}>
                  {aiSummary.suggestion.keyPoints.map((point: string, i: number) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : (
          <AIBanner title="" description="" unavailable />
        )}
      </Drawer>

      {/* Transition Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmTransition}
        onClose={() => setConfirmTransition(null)}
        onConfirm={handleTransition}
        title={`${confirmTransition === TicketStatus.OPEN ? 'Reopen' : getStatusLabel(confirmTransition!)} Ticket`}
        message={`Are you sure you want to change the status to "${getStatusLabel(confirmTransition!)}"?`}
        loading={transitioning}
      />
    </div>
  );
};
