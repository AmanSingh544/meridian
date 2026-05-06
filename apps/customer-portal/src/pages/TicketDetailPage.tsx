import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetTicketQuery, useGetCommentsQuery,
  useTransitionTicketMutation, useCreateCommentMutation,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  useGetAISummaryQuery, useUpdateTicketMutation,
  useGetUsersQuery, useGetProjectsQuery,
} from '@3sc/api';
import { useDocumentTitle, usePermissions, useTicketTransitions } from '@3sc/hooks';
import {
  Button, Card, StatusBadge, PriorityBadge, SLATimer,
  ThreadedComments, Timeline, TimelineItem,
  AIBanner, ErrorState, Skeleton, Badge, Drawer,
  ConfirmDialog, Select, Input, TextArea, PermissionGate,
  AttachmentChip, AttachmentPreviewModal,
} from '@3sc/ui';
import { TicketStatus, TicketPriority, TicketCategory, Permission, UserRole } from '@3sc/types';
import { getStatusLabel, formatDateTime, getStatusColor, uploadWithLimit } from '@3sc/utils';
import type { TicketUpdatePayload } from '@3sc/types';

// ── Transition helper text ────────────────────────────────────────────────────

const TRANSITION_DESCRIPTIONS: Partial<Record<TicketStatus, string>> = {
  [TicketStatus.CLOSED]: 'Closing the ticket marks it as complete. You can reopen it later if the issue returns.',
  [TicketStatus.OPEN]: 'Reopening the ticket will notify your support team that the issue has returned.',
  [TicketStatus.RESOLVED]: 'Mark this ticket as resolved once the issue has been fixed.',
  [TicketStatus.IN_PROGRESS]: 'Mark this ticket as being actively worked on.',
  [TicketStatus.ACKNOWLEDGED]: 'Acknowledge that this ticket has been received and reviewed.',
};

// ── Status history helpers (derived from ticket timestamps) ───────────────────

interface StatusEvent {
  status: TicketStatus;
  label: string;
  timestamp: string;
  color: string;
}

function deriveStatusHistory(ticket: {
  status: TicketStatus;
  created_at: string;
  resolved_at?: string;
  closed_at?: string;
}): StatusEvent[] {
  const events: StatusEvent[] = [
    { status: TicketStatus.OPEN, label: 'Ticket Created', timestamp: ticket.created_at, color: getStatusColor(TicketStatus.OPEN) },
  ];

  if (
    ticket.status === TicketStatus.ACKNOWLEDGED ||
    ticket.status === TicketStatus.IN_PROGRESS ||
    ticket.status === TicketStatus.RESOLVED ||
    ticket.status === TicketStatus.CLOSED
  ) {
    if (ticket.status !== TicketStatus.OPEN) {
      events.push({
        status: TicketStatus.ACKNOWLEDGED,
        label: 'Acknowledged',
        timestamp: ticket.created_at, // backend would supply this; we approximate
        color: getStatusColor(TicketStatus.ACKNOWLEDGED),
      });
    }
  }

  if (
    ticket.status === TicketStatus.IN_PROGRESS ||
    ticket.status === TicketStatus.RESOLVED ||
    ticket.status === TicketStatus.CLOSED
  ) {
    events.push({
      status: TicketStatus.IN_PROGRESS,
      label: 'In Progress',
      timestamp: ticket.created_at,
      color: getStatusColor(TicketStatus.IN_PROGRESS),
    });
  }

  if (ticket.resolved_at) {
    events.push({
      status: TicketStatus.RESOLVED,
      label: 'Resolved',
      timestamp: ticket.resolved_at,
      color: getStatusColor(TicketStatus.RESOLVED),
    });
  }

  if (ticket.closed_at) {
    events.push({
      status: TicketStatus.CLOSED,
      label: 'Closed',
      timestamp: ticket.closed_at,
      color: getStatusColor(TicketStatus.CLOSED),
    });
  }

  // Deduplicate: keep only up to and including the current status
  const statusOrder: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.ACKNOWLEDGED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ];
  const currentIdx = statusOrder.indexOf(ticket.status);
  return events.filter((e) => statusOrder.indexOf(e.status) <= currentIdx);
}

// ── Main component ─────────────────────────────────────────────────────────────

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: ticket, isLoading, error, refetch } = useGetTicketQuery(id!);
  const { data: comments = [] } = useGetCommentsQuery(id!);
  const { data: usersPage } = useGetUsersQuery({});
  const { data: projectsPage } = useGetProjectsQuery({ page: 1, page_size: 50 });
  const { data: aiSummary, isLoading: summaryLoading } = useGetAISummaryQuery(id!, {
    skip: !permissions.canUseAI(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [transitionTicket, { isLoading: transitioning }] = useTransitionTicketMutation();
  const [createComment] = useCreateCommentMutation();
  const [createAttachment] = useCreateAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const [updateTicket, { isLoading: updating }] = useUpdateTicketMutation();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState<TicketStatus | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ id: string; fileName: string; mimeType: string } | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);

  // ── Edit form state ───────────────────────────────────────────────────────
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [editCategory, setEditCategory] = useState<TicketCategory>(TicketCategory.SUPPORT);
  const [editAssignedTo, setEditAssignedTo] = useState('');

  useDocumentTitle(ticket ? `${ticket.ticketNumber} - ${ticket.title}` : 'Ticket');

  const { availableTransitions } = useTicketTransitions(
    ticket?.status ?? TicketStatus.OPEN,
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTransition = async () => {
    if (!confirmTransition || !id) return;
    const isReopen = confirmTransition === TicketStatus.OPEN;
    try {
      await transitionTicket({
        ticketId: id,
        toStatus: confirmTransition,
        comment: isReopen && reopenReason.trim() ? reopenReason.trim() : undefined,
      }).unwrap();
      setConfirmTransition(null);
      setReopenReason('');
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleAddComment = async (content: string, isInternal?: boolean, mentionIds?: string[], attachmentFiles?: File[]) => {
    if (!id) return;

    let attachment_ids: string[] = [];

    if (attachmentFiles && attachmentFiles.length > 0) {
      const results = await uploadWithLimit(
        attachmentFiles,
        (file) => createAttachment({ file, projectId: ticket?.projectId }).unwrap()
      );
      attachment_ids = results.map((r) => String(r?.id)).filter(Boolean);
    }

    try {
      await createComment({
        ticket_id: id,
        message: content,
        isInternal,
        mentioned_user_ids: mentionIds ?? [],
        attachment_ids,
      });
    } catch (err) {
      // Clean up orphaned attachments on failure
      await Promise.all(attachment_ids.map((aid) => deleteAttachment(aid).unwrap().catch(() => {})));
      throw err;
    }
  };

  const openEditDrawer = () => {
    if (!ticket) return;
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setEditCategory(ticket.category);
    setEditAssignedTo(ticket.assignedTo ?? '');
    setShowEditDrawer(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    const payload: TicketUpdatePayload = {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      category: editCategory,
      assignedTo: editAssignedTo || undefined,
    };
    try {
      await updateTicket({ id, payload }).unwrap();
      setShowEditDrawer(false);
    } catch {
      // Error handled by RTK Query
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

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

  // Comments visibility
  const visibleComments = permissions.canCreateInternalComments()
    ? (showInternalNotes ? comments : comments.filter((c) => !c.isInternal))
    : comments.filter((c) => !c.isInternal);

  const internalCount = comments.filter((c) => c.isInternal).length;

  // Agent users for the assignee dropdown
  const agentUsers = (usersPage?.data ?? []).filter(
    (u) => u.role === UserRole.AGENT || u.role === UserRole.LEAD || u.role === UserRole.ADMIN
  );

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...agentUsers.map((u) => ({ value: u.id, label: u.displayName })),
  ];

  const statusHistory = deriveStatusHistory(ticket);
  const isReopenTransition = confirmTransition === TicketStatus.OPEN;

  return (
    <div>
      {/* ── Header ── */}
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

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 20rem', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* ── Left: main content ── */}
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
              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ticket.attachments.map((a) => (
                  <AttachmentChip
                    key={a.id}
                    id={a.id}
                    fileName={a.fileName}
                    mimeType={a.mimeType}
                    fileSize={a.fileSize}
                    onPreview={() => setPreviewAttachment({ id: a.id, fileName: a.fileName, mimeType: a.mimeType })}
                  />
                ))}
              </div>
            )}
            {previewAttachment && (
              <AttachmentPreviewModal
                attachmentId={previewAttachment.id}
                mimeType={previewAttachment.mimeType}
                fileName={previewAttachment.fileName}
                onClose={() => setPreviewAttachment(null)}
              />
            )}
          </Card>

          {/* Conversation */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                Conversation ({visibleComments.filter((c) => !c.isInternal).length})
              </h3>
              <PermissionGate permission={Permission.COMMENT_INTERNAL}>
                <button
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                  style={{
                    background: showInternalNotes ? '#fef3c7' : 'var(--color-bg-subtle)',
                    border: `1px solid ${showInternalNotes ? '#f59e0b' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '0.75rem',
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
              mentionableUsers={agentUsers}
              onAddComment={permissions.canCreateComments()
                ? (content, isInternal, mentionIds, files) => handleAddComment(content, isInternal, mentionIds, files)
                : undefined}
              showInternalToggle={permissions.canCreateInternalComments()}
              allowAttachments={permissions.has(Permission.ATTACHMENT_UPLOAD)}
            />
          </Card>
        </div>

        {/* ── Right: sidebar ── */}
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
                <Badge>{ticket.category.replace(/_/g, ' ')}</Badge>
              </div>
              {ticket.projectId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Project</span>
                  <span style={{ fontWeight: 500 }}>
                    {projectsPage?.data.find((p) => p.id === ticket.projectId)?.name ?? ticket.projectId}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Created</span>
                <span>{formatDateTime(ticket.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Updated</span>
                <span>{formatDateTime(ticket.updated_at)}</span>
              </div>
              {ticket.assignee && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Assigned to</span>
                  <span>{ticket.assignee.displayName}</span>
                </div>
              )}
              {ticket.creator && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Submitted by</span>
                  <span>{ticket.creator.displayName}</span>
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

          {/* Status Timeline — richer version */}
          <Card>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}>Timeline</h4>
            <Timeline>
              {statusHistory.map((event, idx) => (
                <TimelineItem
                  key={event.status}
                  title={event.label}
                  timestamp={formatDateTime(event.timestamp)}
                  color={event.color}
                  isLast={idx === statusHistory.length - 1}
                />
              ))}
            </Timeline>
          </Card>
        </div>
      </div>

      {/* ── Edit Ticket Drawer ── */}
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
            options={Object.values(TicketPriority).map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))}
          />
          <Select
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
            options={Object.values(TicketCategory).map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
          />
          <PermissionGate permission={Permission.TICKET_ASSIGN}>
            <Select
              label="Assignee"
              value={editAssignedTo}
              onChange={(e) => setEditAssignedTo(e.target.value)}
              options={assigneeOptions}
            />
          </PermissionGate>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowEditDrawer(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} loading={updating} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── AI Summary Drawer ── */}
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

      {/* ── Transition Confirmation ── */}
      <ConfirmDialog
        isOpen={!!confirmTransition}
        onClose={() => { setConfirmTransition(null); setReopenReason(''); }}
        onConfirm={handleTransition}
        title={`${isReopenTransition ? 'Reopen' : getStatusLabel(confirmTransition!)} Ticket`}
        message={
          TRANSITION_DESCRIPTIONS[confirmTransition!] ??
          `Are you sure you want to change the status to "${getStatusLabel(confirmTransition!)}"?`
        }
        loading={transitioning}
      >
        {/* Extra reopen reason field rendered inside confirm dialog */}
        {isReopenTransition && (
          <div style={{ marginTop: '1rem' }}>
            <TextArea
              label="Reason for reopening (optional)"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. The issue has returned after the last update..."
              rows={3}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};
