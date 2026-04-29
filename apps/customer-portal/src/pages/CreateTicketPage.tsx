import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateTicketMutation,
  useCreateAttachmentMutation,
  useGetAIKBDeflectionsQuery,
  useClassifyTextMutation,
  useGetProjectsQuery,
  useGetSystemSettingsQuery,
  useGetSLAPolicyQuery,
  useGetSimilarTicketsQuery,
} from '@3sc/api';
import { useDocumentTitle, useDebouncedValue, useIsMobile } from '@3sc/hooks';
import { Button, Input, TextArea, Select, FileUpload, Card, useToast, ConfidenceBar } from '@3sc/ui';
import { TicketPriority, TicketCategory } from '@3sc/types';

// ── Priority / Category options ───────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: TicketPriority.LOW,      label: 'Low' },
  { value: TicketPriority.MEDIUM,   label: 'Medium' },
  { value: TicketPriority.HIGH,     label: 'High' },
  { value: TicketPriority.CRITICAL, label: 'Critical' },
];

const CATEGORY_OPTIONS = [
  { value: TicketCategory.SUPPORT,         label: 'Support' },
  { value: TicketCategory.BUG,             label: 'Bug Report' },
  { value: TicketCategory.FEATURE_REQUEST, label: 'Feature Request' },
  { value: TicketCategory.QUESTION,        label: 'Question' },
  { value: TicketCategory.INCIDENT,        label: 'Incident' },
  { value: TicketCategory.TASK,            label: 'Task' },
];

const ENVIRONMENT_OPTIONS = [
  { value: '',          label: 'Select environment' },
  { value: 'PROD',      label: 'Production' },
  { value: 'UAT',       label: 'UAT / Staging' },
  { value: 'DEV',       label: 'Development' },
  { value: 'LOCAL',     label: 'Local' },
];

const PRIORITY_EMOJI: Record<TicketPriority, string> = {
  [TicketPriority.LOW]:      '🟢',
  [TicketPriority.MEDIUM]:   '🟡',
  [TicketPriority.HIGH]:     '🟠',
  [TicketPriority.CRITICAL]: '🔴',
};

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ── Tips shown when no AI content is available yet ───────────────────────────

const TIPS = [
  { icon: '📝', text: 'Include exact error messages or codes you see.' },
  { icon: '🔁', text: 'List the steps that reproduce the issue.' },
  { icon: '👥', text: 'Mention how many people are affected.' },
  { icon: '📸', text: 'Attach screenshots or logs to help us diagnose faster.' },
];

// ── Sidebar AI classify card (compact vertical layout for narrow column) ──────

interface AIClassifySidebarProps {
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  categoryConfidence: number;
  priorityConfidence: number;
  categoryReasoning: string;
  priorityReasoning: string;
  priorityFactors: string[];
  currentCategory: TicketCategory;
  currentPriority: TicketPriority;
  onAccept: () => void;
  onDismiss: () => void;
}

const AIClassifySidebar: React.FC<AIClassifySidebarProps> = ({
  suggestedCategory, suggestedPriority,
  categoryConfidence, priorityConfidence,
  categoryReasoning, priorityReasoning, priorityFactors,
  currentCategory, currentPriority,
  onAccept, onDismiss,
}) => {
  const catChanged = suggestedCategory !== currentCategory;
  const priChanged = suggestedPriority !== currentPriority;
  if (!catChanged && !priChanged) return null;

  return (
    <div style={{
      background: 'linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%)',
      border: '1px solid #c7d2fe',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '1rem' }}>🤖</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4338ca' }}>
            AI Suggestion
          </span>
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#3730a3', lineHeight: 1.4 }}>
        Based on your description:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.875rem' }}>
        {catChanged && (
          <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.75rem' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1', marginBottom: '0.25rem' }}>
              Category
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1b4b', marginBottom: '0.375rem' }}>
              {labelFor(CATEGORY_OPTIONS, suggestedCategory)}
            </div>
            <ConfidenceBar confidence={categoryConfidence} />
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#4338ca', lineHeight: 1.5 }}>
              {categoryReasoning}
            </p>
          </div>
        )}

        {priChanged && (
          <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.75rem' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1', marginBottom: '0.25rem' }}>
              Priority
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1b4b', marginBottom: '0.375rem' }}>
              {PRIORITY_EMOJI[suggestedPriority]} {labelFor(PRIORITY_OPTIONS, suggestedPriority)}
            </div>
            <ConfidenceBar confidence={priorityConfidence} />
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#4338ca', lineHeight: 1.5 }}>
              {priorityReasoning}
            </p>
            {priorityFactors.length > 0 && (
              <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1rem', fontSize: '0.75rem', color: '#4338ca', lineHeight: 1.6 }}>
                {priorityFactors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <Button variant="primary" size="sm" onClick={onAccept} style={{ width: '100%' }}>
        ✓ Apply suggestions
      </Button>
    </div>
  );
};

// ── AI pre-fill grid card (matches screenshot design) ─────────────────────────

interface AIPreFillGridProps {
  category: string;
  priority: string;
  environment?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

const AIPreFillGrid: React.FC<AIPreFillGridProps> = ({ category, priority, environment, onAccept, onDismiss }) => (
  <div style={{
    background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
    border: '1px solid #c7d2fe',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem',
    marginBottom: '0.75rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        ✦ AI pre-fill suggestion
      </span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: '0.875rem', padding: 0 }}>✕</button>
    </div>
    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#3730a3' }}>
      Based on your description, we identified the following:
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {[
        { label: 'Category', value: category.charAt(0) + category.slice(1).toLowerCase().replace('_', ' ') },
        { label: 'Severity', value: `Severity ${priority === 'CRITICAL' ? '1 (Critical)' : priority === 'HIGH' ? '2 (High)' : priority === 'MEDIUM' ? '3 (Moderate)' : '4 (Low)'}` },
        ...(environment ? [{ label: 'Environment', value: environment }] : []),
      ].map(field => (
        <div key={field.label} style={{
          background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 0.75rem', border: '1px solid rgba(199,210,254,0.5)',
        }}>
          <p style={{ margin: '0 0 0.125rem', fontSize: '0.6875rem', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.label}</p>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1e1b4b' }}>{field.value}</p>
        </div>
      ))}
    </div>

    <p style={{ margin: '0 0 0.625rem', fontSize: '0.75rem', color: '#4338ca', textAlign: 'center' }}>
      Similar tickets — may already be resolved
    </p>

    <Button variant="primary" size="sm" onClick={onAccept} style={{ width: '100%' }}>
      ✓ Apply suggestions
    </Button>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const CreateTicketPage: React.FC = () => {
  useDocumentTitle('Create Ticket');
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [createTicket, { isLoading }] = useCreateTicketMutation();
  const [createAttachment] = useCreateAttachmentMutation();
  const [classifyText, { isLoading: classifying }] = useClassifyTextMutation();

  // Feature flags + SLA data
  const { data: systemSettings } = useGetSystemSettingsQuery();
  const { data: slaPolicy } = useGetSLAPolicyQuery();
  const triageEnabled   = systemSettings?.aiFeatures?.triageAgentEnabled ?? true;
  const kbEnabled       = systemSettings?.aiFeatures?.kbDeflectionEnabled ?? true;
  const similarEnabled  = systemSettings?.aiFeatures?.similarTicketSuggestionsEnabled ?? false;

  // Fetch projects for the dropdown
  const { data: projectsData } = useGetProjectsQuery({ page: 1, page_size: 100 });
  const projectOptions = [
    { value: '', label: 'No project' },
    ...(projectsData?.data ?? []).map(p => ({ value: p.id, label: p.name })),
  ];

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.SUPPORT);
  const [projectId, setProjectId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── AI suggestion state ──────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: TicketCategory;
    priority: TicketPriority;
    categoryConfidence: number;
    priorityConfidence: number;
    categoryReasoning: string;
    priorityReasoning: string;
    priorityFactors: string[];
  } | null>(null);

  // ── Debounced values ─────────────────────────────────────────────────────────
  const debouncedTitle = useDebouncedValue(title, 500);
  const debouncedDescription = useDebouncedValue(description, 800);

  const { data: kbDeflections } = useGetAIKBDeflectionsQuery(
    { query: `${debouncedTitle} ${debouncedDescription}`.trim(), limit: 3 },
    { skip: debouncedTitle.length < 5 || !kbEnabled },
  );

  const { data: similarTickets } = useGetSimilarTicketsQuery(
    { title: debouncedTitle, description: debouncedDescription },
    { skip: debouncedTitle.length < 5 || !similarEnabled },
  );

  useEffect(() => {
    if (!triageEnabled) return;
    // Don't re-classify while a suggestion is already showing
    if (aiSuggestion !== null) return;
    if (debouncedTitle.length < 10 || debouncedDescription.length < 30) return;

    classifyText({ title: debouncedTitle, description: debouncedDescription })
      .unwrap()
      .then((result) => { setAiSuggestion(result); })
      .catch(() => {
        // Silently ignore — AI is enhancement only
      });
  }, [debouncedTitle, debouncedDescription, triageEnabled]);

  // Reset suggestion when user meaningfully changes the title (new topic)
  useEffect(() => {
    setAiSuggestion(null);
  }, [title]);

  const handleAcceptAI = () => {
    if (!aiSuggestion) return;
    setCategory(aiSuggestion.category);
    setPriority(aiSuggestion.priority);
    setAiSuggestion(null);
  };

  // ── Description quality hint ─────────────────────────────────────────────────
  const descriptionTooShort = description.length > 0 && description.length < 50;
  const descriptionHint = descriptionTooShort
    ? 'More detail helps us resolve your ticket faster.'
    : undefined;

  // ── Tags parsing ─────────────────────────────────────────────────────────────
  const parsedTags = tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      let attachment_ids: number[] = [];

      if (files.length > 0) {
        setUploading(true);
        const results = await Promise.all(
          files.map((file) =>
            createAttachment({
              file_name: file.name,
              file_type: file.type,
              file_path: `/uploads/${file.name}`,
              metadata: {},
            }).unwrap()
          )
        );
        attachment_ids = results.map((r) => r?.data?.id).filter(Boolean);
        setUploading(false);
      }

      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        tags: parsedTags,
        attachment_ids,
        projectId: projectId || undefined,
        environment: environment || undefined,
      } as any).unwrap();

      toast('Ticket created successfully', 'success');
      navigate(`/tickets/${ticket.id}`);
    } catch {
      setUploading(false);
      toast('Failed to create ticket', 'error');
    }
  };

  const hasAISuggestion = aiSuggestion !== null && !classifying;
  const hasKBDeflections = kbDeflections && kbDeflections.length > 0;
  const hasSimilarTickets = similarEnabled && similarTickets && similarTickets.length > 0;
  const hasSidebarContent = classifying || hasAISuggestion || hasKBDeflections || hasSimilarTickets;

  // ── Layout ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '70rem' }}>
      <style>{spinStyle}</style>

      <button
        onClick={() => navigate('/tickets')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.8125rem', color: 'var(--color-text-muted)',
          marginBottom: '0.75rem', padding: 0,
        }}
      >
        ← Back to tickets
      </button>

      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        Create New Ticket
      </h1>

      {/* Two-column layout — collapses on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 20rem',
        gap: '1.5rem',
        alignItems: 'start',
      }}>

        {/* ── Left: Form card ── */}
        <Card>
          <form onSubmit={handleSubmit}>
            <Input
              label="Subject"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe your issue"
              required
              autoFocus
            />

            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information — steps to reproduce, error messages, who is affected..."
              required
              hint={descriptionHint}
              rows={6}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Select
                label="Priority"
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
              />
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
                  marginBottom: '0.375rem', color: 'var(--color-text)',
                }}>
                  Project <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <Select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 0.625rem',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: '0.875rem', outline: 'none',
                  }}
                  options={projectOptions.map(o => (
                    { value: o.value, label: o.label }
                  ))}
                />
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Link this ticket to a project so your team can track it together.
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
                  marginBottom: '0.375rem', color: 'var(--color-text)',
                }}>
                  Environment <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <Select
                  value={environment}
                  onChange={e => setEnvironment(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 0.625rem',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: '0.875rem', outline: 'none',
                  }}
                  options={ENVIRONMENT_OPTIONS.map(o => (
                    { value: o.value, label: o.label }
                  ))}
                />
                  
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Helps us reproduce and fix issues faster.
                </p>
              </div>
            </div>

            <Input
              label="Tags (optional)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. sso, login, urgent — comma separated"
              hint={parsedTags.length > 0 ? `Tags: ${parsedTags.join(', ')}` : undefined}
            />

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Attachments
              </label>
              <FileUpload onFilesSelected={setFiles} uploading={uploading} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/tickets')}>
                Cancel
              </Button>
              <Button type="submit" loading={isLoading || uploading}>
                Create Ticket
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Right: AI sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* AI classifying indicator */}
          {classifying && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.75rem 1rem',
              background: '#eef2ff', border: '1px solid #c7d2fe',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.8125rem', color: '#4338ca',
            }}>
              <span style={{
                width: '0.875rem', height: '0.875rem', flexShrink: 0,
                border: '2px solid #6366f1', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              AI is analysing your description...
            </div>
          )}

          {/* AI category + priority suggestion — pre-fill grid (matches screenshot) */}
          {hasAISuggestion && aiSuggestion && (
            <AIPreFillGrid
              category={aiSuggestion.category}
              priority={aiSuggestion.priority}
              environment={environment || undefined}
              onAccept={handleAcceptAI}
              onDismiss={() => setAiSuggestion(null)}
            />
          )}

          {/* KB deflection — relevant articles */}
          {hasKBDeflections && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              marginBottom: hasSidebarContent ? 0 : '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '1rem' }}>💡</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8' }}>
                  Related Articles
                </span>
              </div>
              <p style={{ margin: '0 0 0.625rem', fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.4 }}>
                These might answer your question — check before submitting:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {kbDeflections!.map((s) => (
                  <button
                    key={s.articleId}
                    type="button"
                    onClick={() => navigate(`/knowledge/${s.articleId}`)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left',
                      width: '100%', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.75)', border: '1px solid #bfdbfe',
                      borderRadius: 'var(--radius-md)', padding: '0.5rem 0.625rem',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', marginTop: '0.1rem', flexShrink: 0 }}>📄</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8', lineHeight: 1.3 }}>{s.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.4, marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {s.excerpt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Similar resolved tickets */}
          {hasSimilarTickets && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '1rem' }}>🔍</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803d' }}>
                  Similar Resolved Tickets
                </span>
              </div>
              <p style={{ margin: '0 0 0.625rem', fontSize: '0.8125rem', color: '#166534', lineHeight: 1.4 }}>
                These tickets were resolved previously — they may help:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {similarTickets!.map((t) => (
                  <button
                    key={t.ticketId}
                    type="button"
                    onClick={() => navigate(`/tickets/${t.ticketId}`)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left',
                      width: '100%', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.75)', border: '1px solid #bbf7d0',
                      borderRadius: 'var(--radius-md)', padding: '0.5rem 0.625rem',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', marginTop: '0.1rem', flexShrink: 0 }}>✅</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d', lineHeight: 1.3 }}>
                        #{t.ticketNumber} — {t.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tips for a great ticket — always visible fallback */}
          <div style={{
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem' }}>✨</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                Tips for a great ticket
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {TIPS.map((tip) => (
                <div key={tip.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', flexShrink: 0, marginTop: '0.05rem' }}>{tip.icon}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SLA note */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Response times</span><br />
            {slaPolicy ? (
              <>
                Critical &amp; High priority tickets are responded to within{' '}
                <strong>{slaPolicy.priorities?.CRITICAL?.responseHours ?? 2}h</strong>.{' '}
                Medium within <strong>{slaPolicy.priorities?.MEDIUM?.responseHours ?? 8}h</strong>.{' '}
                Low within <strong>1 business day</strong>.
              </>
            ) : (
              <>
                Critical &amp; High priority tickets are responded to within <strong>2 hours</strong>. Medium within <strong>8 hours</strong>. Low within <strong>1 business day</strong>.
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
